// npx tsx scripts/migrate-accounts.ts
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { toSearchName } from "../src/lib/schemas/account-schema";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

function normTags(tags: any): string[] {
  if (!Array.isArray(tags)) return [];
  const clean = tags
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean)
    .map((t) => t.toLowerCase());
  return Array.from(new Set(clean));
}

function asTimestamp(v: any, fallbackNow = false): Timestamp | null {
  if (!v) return fallbackNow ? Timestamp.now() : null;
  if (v instanceof Timestamp) return v;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(+d) ? (fallbackNow ? Timestamp.now() : null) : Timestamp.fromDate(d);
}

(async () => {
  const snap = await db.collection("accounts").get();
  console.log(`Migrando ${snap.size} cuentas...`);

  let updates = 0;
  const batchSize = 400;
  let batch = db.batch();
  let count = 0;

  for (const doc of snap.docs) {
    const a = doc.data();
    const payload: any = {};

    // Elimina 'status' legacy
    if ("status" in a) payload.status = FieldValue.delete();

    // stage
    if (!a.stage) payload.stage = "Prospect";

    // searchName
    const expected = toSearchName(a.name || "");
    if (a.searchName !== expected) payload.searchName = expected;

    // tags
    const t = normTags(a.tags);
    if (JSON.stringify(t) !== JSON.stringify(a.tags || [])) payload.tags = t;

    // timestamps
    const createdAt = asTimestamp(a.createdAt, true);
    const updatedAt = asTimestamp(a.updatedAt, true);
    if (!(a.createdAt instanceof Timestamp)) payload.createdAt = createdAt;
    // updatedAt siempre refrescado a "ahora"
    payload.updatedAt = Timestamp.now();

    // address simple: trim city
    if (a.address && typeof a.address === "object" && a.address.city) {
      const city = String(a.address.city).trim();
      if (city !== a.address.city) payload["address.city"] = city;
    }

    // derivados: normaliza si vienen como string
    for (const k of ["firstOrderAt", "lastOrderAt"]) {
      if (a[k] && !(a[k] instanceof Timestamp)) {
        const ts = asTimestamp(a[k]);
        if (ts) payload[k] = ts;
      }
    }

    // counters default
    if (typeof a.ordersCount !== "number") payload.ordersCount = 0;
    if (typeof a.lifetimeValue !== "number") payload.lifetimeValue = 0;

    if (Object.keys(payload).length) {
      batch.update(doc.ref, payload);
      updates++;
    }
    count++;

    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`✔ Commiteadas ${count} cuentas...`);
    }
  }

  await batch.commit();
  console.log(`Listo. Documentos actualizados: ${updates}`);
})();
