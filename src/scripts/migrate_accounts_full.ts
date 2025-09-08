/**
 * Migración canónica de `accounts` (Santa Brisa CRM)
 *
 * • Backfill:
 *   - name ← nombre
 *   - city ← ciudad
 *   - salesRepId ← responsableId
 *   - accountType ← type
 *   - nameNorm = normalize(name)
 *   - accountStage = classify(interactions, orders) || mapFromStatus(status)
 *   - backup previo del doc en `accounts_migration_backups/{id}`
 *
 * • Cleanup:
 *   - elimina legacy: nombre, ciudad, status, type, responsableId
 *
 * Uso:
 *   FIREBASE_ADMIN_JSON='{"project_id":"...","client_email":"...","private_key":"..."}' \
 *   npx ts-node scripts/migrate_accounts_full.ts --mode backfill --dry
 *
 *   # backfill real (sin dry-run)
 *   npx ts-node scripts/migrate_accounts_full.ts --mode backfill
 *
 *   # limpieza (destructiva) con confirmación
 *   CONFIRM_DELETE=YES npx ts-node scripts/migrate_accounts_full.ts --mode cleanup
 *
 *   # todo de una vez (backfill + cleanup)
 *   CONFIRM_DELETE=YES npx ts-node scripts/migrate_accounts_full.ts --mode both
 *
 * Flags opcionales:
 *   --limit 200     // procesa solo N cuentas (para pruebas)
 */

import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

// -------- CLI args --------
const args = new Map<string, string | boolean>();
process.argv.slice(2).forEach((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args.set(m[1], m[2] ?? true);
});
const MODE = String(args.get("mode") || "backfill") as "backfill" | "cleanup" | "both";
const DRY = Boolean(args.get("dry") || false);
const LIMIT = args.has("limit") ? Number(args.get("limit")) : undefined;
const CONFIRM_DELETE = process.env.CONFIRM_DELETE === "YES";

// -------- Admin init --------
function initDb() {
  if (getApps().length) {
    return getFirestore();
  }
  // Use Application Default Credentials, which is standard for managed environments.
  initializeApp({
    credential: applicationDefault(),
  });
  return getFirestore();
}
const db = initDb();

// -------- Helpers --------
const normalize = (s?: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

type AccountStage = "SEGUIMIENTO" | "FALLIDA" | "ACTIVA" | "POTENCIAL";

// Fallback desde status (strings legacy típicos)
function stageFromStatusLegacy(status?: string): AccountStage | undefined {
  if (!status) return undefined;
  const s = normalize(status);
  if (s.includes("activo")) return "ACTIVA";
  if (s.includes("fallid")) return "FALLIDA";
  if (s.includes("seguim") || s.includes("program")) return "SEGUIMIENTO";
  return undefined;
}

// Clasificador desde hechos
async function classifyAccountStage(accountId: string): Promise<AccountStage | undefined> {
  // Cargamos interacciones y pedidos mínimos para decidir
  // Corrección: ambas son de la colección 'orders'
  const interactionsSnap = await db.collection("orders").where("accountId", "==", accountId).get();
  
  const interactions = interactionsSnap.docs.map((d) => d.data() as any);
  const orders = interactions.filter(i => i.status === 'Confirmado' || i.status === 'Entregado' || i.status === 'Pagado');

  const hasOrders = orders.length > 0;
  const hasFutureTask = interactions.some((i) => i?.status === "Programada");
  const hasFailedVisit = interactions.some((i) => i?.status === "Fallido");

  let lastOrderDate: Date | null = null;
  if (hasOrders) {
    const dates = orders
      .map((o) => {
        const v = (o as any).date ?? (o as any).createdAt;
        if (!v) return null;
        if (typeof v === "string") return new Date(v);
        if (v?._seconds) return new Date(v._seconds * 1000);
        return null;
      })
      .filter(Boolean) as Date[];
    if (dates.length) lastOrderDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  }

  const msInDay = 24 * 60 * 60 * 1000;
  const moreThanYearSinceOrder =
    !!lastOrderDate && (Date.now() - lastOrderDate.getTime()) / msInDay > 365;

  if (hasFutureTask && !hasOrders) return "SEGUIMIENTO";
  if (hasFailedVisit || moreThanYearSinceOrder) return "FALLIDA";
  if (hasOrders) return "ACTIVA";
  return "POTENCIAL";
}

// Backup del doc de account (json íntegro) antes de tocarlo
async function backupAccountDoc(accountId: string, data: any) {
  const ref = db.collection("accounts_migration_backups").doc(accountId);
  const payload = {
    backupAt: Timestamp.now(),
    data, // documento íntegro tal cual estaba
  };
  if (DRY) return;
  await ref.set(payload, { merge: true });
}

// -------- Backfill canónico --------
async function runBackfill() {
  const accCol = db.collection("accounts");
  const snap = LIMIT ? await accCol.limit(LIMIT).get() : await accCol.get();
  console.log(`Backfill: procesando ${snap.size} cuentas${LIMIT ? ` (limit ${LIMIT})` : ""}…`);

  const batchSize = 400;
  let batch = db.batch();
  let count = 0;
  let writes = 0;

  for (const doc of snap.docs) {
    const a = doc.data() as any;

    // 1) Determinar canónicos desde legacy si faltan
    const canonicalName = a.name ?? a.nombre ?? "";
    const canonicalCity = a.city ?? a.ciudad ?? undefined;
    const salesRepId = a.salesRepId ?? a.responsableId ?? undefined;
    const accountType = a.accountType ?? a.type ?? undefined;

    // 2) Stage (prefiere hechos; si no, usa status legacy; si nada, POTENCIAL)
    let stage: AccountStage | undefined = a.accountStage;
    if (!stage) {
      try {
        stage = await classifyAccountStage(doc.id);
      } catch {
        // Si falla el clasificador por volumen/índices, cae al fallback legacy
        stage = stageFromStatusLegacy(a.status) ?? "POTENCIAL";
      }
    }

    // 3) Construir update
    const update: any = {
      name: canonicalName,
      nameNorm: normalize(canonicalName),
      city: canonicalCity,
      salesRepId,
      accountType,
      accountStage: stage,
      createdAt: a.createdAt ?? Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // 4) Backup + update
    await backupAccountDoc(doc.id, a);

    if (!DRY) batch.update(doc.ref, update);
    count++;
    writes++;

    if (writes >= batchSize) {
      if (!DRY) await batch.commit();
      batch = db.batch();
      writes = 0;
      console.log(`  ✓ Backfill commit: ${count}/${snap.size}`);
    }
  }

  if (writes > 0 && !DRY) {
    await batch.commit();
    console.log(`  ✓ Backfill commit final: ${count}/${snap.size}`);
  }

  console.log(`✅ Backfill completado (${count} cuentas).${DRY ? " (dry-run)" : ""}`);
}

// -------- Cleanup (destructivo) --------
async function runCleanup() {
  if (!CONFIRM_DELETE) {
    console.error("⛔ Limpieza abortada: falta CONFIRM_DELETE=YES en el entorno.");
    process.exit(2);
  }
  const accCol = db.collection("accounts");
  const snap = LIMIT ? await accCol.limit(LIMIT).get() : await accCol.get();
  console.log(`Cleanup: procesando ${snap.size} cuentas${LIMIT ? ` (limit ${LIMIT})` : ""}…`);

  const batchSize = 400;
  let batch = db.batch();
  let count = 0;
  let writes = 0;

  const LEGACY_FIELDS = ["nombre", "ciudad", "status", "type", "responsableId"];

  for (const doc of snap.docs) {
    const delPayload: any = {};
    for (const f of LEGACY_FIELDS) delPayload[f] = FieldValue.delete();

    if (!DRY) batch.update(doc.ref, delPayload);
    count++;
    writes++;

    if (writes >= batchSize) {
      if (!DRY) await batch.commit();
      batch = db.batch();
      writes = 0;
      console.log(`  ✓ Cleanup commit: ${count}/${snap.size}`);
    }
  }

  if (writes > 0 && !DRY) {
    await batch.commit();
    console.log(`  ✓ Cleanup commit final: ${count}/${snap.size}`);
  }

  console.log(`🧹 Limpieza de legacy completada (${count} cuentas).${DRY ? " (dry-run)" : ""}`);
}

// -------- Main --------
(async function main() {
  console.log(`▶ Migración accounts — mode=${MODE} dry=${DRY} limit=${LIMIT ?? "∞"}`);
  if (MODE === "backfill") {
    await runBackfill();
  } else if (MODE === "cleanup") {
    await runCleanup();
  } else if (MODE === "both") {
    await runBackfill();
    await runCleanup();
  } else {
    console.error("Modo no reconocido. Usa --mode backfill|cleanup|both");
    process.exit(1);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
