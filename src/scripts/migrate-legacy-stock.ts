// migrate-legacy-stock.ts
// ------------------------------------------------------------
// ONE‑SHOT script to migrate aggregated `inventoryItems.stock` → per‑lot
// Opening Balance documents in `itemBatches`.
// USAGE:
//   npx tsx src/scripts/migrate-legacy-stock.ts
//   (funciona con Application Default Credentials de gcloud)
// ------------------------------------------------------------
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue, BulkWriter, Timestamp, QueryDocumentSnapshot, Query } from 'firebase-admin/firestore';

(async () => {
  // -------- 0.  Init Admin SDK (ADC fallback) ------------------
  const credential = process.env.SA_JSON
    ? cert(JSON.parse(process.env.SA_JSON))
    : applicationDefault();

  initializeApp({ credential, projectId: process.env.GCLOUD_PROJECT || process.env.PROJECT_ID || 'santa-brisa-crm' });
  const db = getFirestore();

  // -------- 1.  Quick idempotency check -----------------------
  const FLAG_DOC = db.doc('migrationFlags/openingBalanceDone');
  const flagSnap = await FLAG_DOC.get();
  if (flagSnap.exists) {
    console.log('🚫  Opening Balance migration already executed on', flagSnap.get('runAt').toDate().toISOString());
    return;
  }

  // -------- 2.  Helpers --------------------------------------
  const batchCollection = db.collection('itemBatches');
  const inventoryCol    = db.collection('inventoryItems');

  function buildLegacyBatch(item: any, qty: number) {
    const skuPart = (item.sku || 'NA').substring(0, 4).toUpperCase();
    return {
      inventoryItemId: item.id,
      internalBatchCode: `OB-${skuPart}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      qtyInitial: qty,
      qtyRemaining: qty,
      uom: item.uom || 'unit',
      unitCost: item.latestPurchase?.calculatedUnitCost || 0,
      qcStatus: 'Released',
      isClosed: false,
      isLegacy: true,
      createdAt: item.createdAt ?? Timestamp.now(),
    };
  }

  // -------- 3.  Paged migration with BulkWriter ---------------
  const writer = db.bulkWriter();
  writer.onWriteError(err => {
    console.error('Write error', err);
    return err.failedAttempts < 2; // retry once
  });

  let migrated = 0;
  let pageToken: QueryDocumentSnapshot | null = null;
  const pageSize = 500;

  while (true) {
    let q: Query = inventoryCol.orderBy('__name__').limit(pageSize);
    if (pageToken) q = q.startAfter(pageToken);
    const snapshot = await q.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const item = { id: doc.id, ...doc.data() } as any;
      const canonicalStock = item.stock || 0;
      if (canonicalStock <= 0) continue;

      const batches = await batchCollection.where('inventoryItemId', '==', item.id).get();
      const batchedQty = batches.docs.reduce((acc, d) => acc + (d.get('qtyRemaining') || 0), 0);
      const diff = canonicalStock - batchedQty;
      if (diff <= 0.001) continue;

      // create opening balance
      const newDoc = batchCollection.doc();
      writer.set(newDoc, buildLegacyBatch(item, diff));
      writer.update(inventoryCol.doc(item.id), { stock: FieldValue.increment(-diff) });
      migrated++;
    }

    pageToken = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < pageSize) break; // last page
  }

  await writer.close();
  await FLAG_DOC.set({ done: true, runAt: Timestamp.now(), migrated });

  console.log(`✅  Migration finished. Opening Balance lots created: ${migrated}`);
})();
