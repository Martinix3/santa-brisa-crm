import { NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebaseAdmin";
import type { FirebaseFirestore } from "firebase-admin/firestore";

/** ---------- helpers ---------- */
const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

type Inferred =
  | "string" | "number" | "boolean" | "null" | "array" | "object"
  | "timestamp" | "geo" | "reference" | "bytes" | "unknown";

function inferType(v: any): Inferred {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return "string";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (Array.isArray(v)) return "array";
  if (v?._seconds && v?._nanoseconds) return "timestamp";
  if (v?.latitude !== undefined && v?.longitude !== undefined) return "geo";
  if (v?._path || v?._firestore) return "reference";
  if (v?._byteString) return "bytes";
  if (typeof v === "object") return "object";
  return "unknown";
}

/** Aplana objetos/arrays a paths tipo foo.bar, items[0].sku con samples */
function flattenDoc(obj: any, prefix = "", out: Record<string, any[]> = {}) {
  if (obj === null || obj === undefined) return out;
  if (Array.isArray(obj)) {
    const key = prefix || "(root)";
    (out[key] ||= []).push({ sample: obj.slice(0, 3) });
    if (obj.length && typeof obj[0] === "object") {
      obj.forEach((it, idx) => flattenDoc(it, `${prefix}[${idx}]`, out));
    }
    return out;
  }
  if (typeof obj === "object" && !(v => v?._seconds && v?._nanoseconds)(obj) && !(v => v?.latitude !== undefined && v?.longitude !== undefined)(obj) && !(v => v?._path || v?._firestore)(obj)) {
    if (prefix) (out[prefix] ||= []).push({ sample: obj });
    for (const k of Object.keys(obj)) {
      flattenDoc(obj[k], prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
  }
  const key = prefix || "(root)";
  (out[key] ||= []).push(obj);
  return out;
}

function analyzeCollectionDocs(docs: any[]) {
  const fields: Record<string, { types: Set<Inferred>, samples: any[], count: number, uniques?: number, min?: number, max?: number }> = {};
  for (const d of docs) {
    const flat: Record<string, any[]> = {};
    flattenDoc(d, "", flat);
    for (const [k, arr] of Object.entries(flat)) {
      const entry = fields[k] ||= { types: new Set<Inferred>(), samples: [], count: 0 };
      entry.count += arr.length;
      for (const v of arr) {
        const raw = (v && typeof v === "object" && "sample" in v) ? (v as any).sample : v;
        const t = inferType(raw);
        entry.types.add(t);
        if (entry.samples.length < 5) entry.samples.push(v);
        if (t === "number") {
          const n = Number(raw);
          entry.min = entry.min === undefined ? n : Math.min(entry.min, n);
          entry.max = entry.max === undefined ? n : Math.max(entry.max, n);
        }
      }
    }
  }
  const out: Record<string, { types: Inferred[], samples: any[], count: number, uniques?: number, min?: number, max?: number }> = {};
  for (const [k, v] of Object.entries(fields)) {
    const uniques = new Set(v.samples.map(s => JSON.stringify(s))).size;
    out[k] = { ...v, types: Array.from(v.types), uniques };
  }
  return out;
}

const REL_KEYS = [
  "accountId", "account_id", "account", "accId",
  "customerId", "clienteId", "cuentaId",
  "accountRef", "account.ref", "account.id",
];

async function queryRelated(db: FirebaseFirestore.Firestore, colId: string, accountId: string) {
  const col = db.collection(colId);
  const results: any[] = [];

  // intenta por múltiples claves
  for (const key of REL_KEYS) {
    try {
      const s = await col.where(key as any, "==", accountId).limit(500).get();
      if (!s.empty) results.push(...s.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch {}
  }
  // fallback: scan limitado
  if (results.length === 0) {
    try {
      const scan = await col.limit(500).get();
      for (const d of scan.docs) {
        const data = d.data();
        if (JSON.stringify(data).includes(accountId)) {
          results.push({ id: d.id, ...data });
        }
      }
    } catch {}
  }
  // dedup
  const seen = new Set<string>();
  return results.filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

async function listTopCollections(db: FirebaseFirestore.Firestore) {
  const cols = await db.listCollections();
  const skip = new Set<string>(["_migrations", "_settings", "migrationFlags", "counters"]);
  return cols.filter(c => !skip.has(c.id));
}

async function findAccountsByName(name: string, db: FirebaseFirestore.Firestore) {
  const n = normalize(name);
  const acc = db.collection("accounts");
  try {
    const a = await acc.where("searchName", "==", toSearchName(n)).get();
    if (!a.empty) return a.docs;
  } catch {}
  try {
    const b = await acc.where("name", "==", name).get();
    if (!b.empty) return b.docs;
  } catch {}
  const c = await acc.limit(500).get();
  return c.docs.filter(d => normalize(String(d.get("name") || "")) === n);
}

const toSearchName = (s:string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g," ").trim().replace(/\s/g, "_");

async function readAccountSubcollections(db: FirebaseFirestore.Firestore, accountId: string) {
  const ref = db.collection("accounts").doc(accountId);
  const subs = await ref.listCollections();
  const out: Record<string, any[]> = {};
  for (const s of subs) {
    const snap = await s.get();
    out[`accounts/${accountId}/${s.id}`] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  }
  return out;
}

function basicMetrics(related: Record<string, any[]>) {
  const images: string[] = [];
  let totalAmount = 0;
  let docsCount = 0;
  for (const docs of Object.values(related)) {
    docsCount += docs.length;
    for (const d of docs) {
      for (const [_, v] of Object.entries(d)) {
        if (typeof v === "string" && /^https?:\/\/.+\.(png|jpg|jpeg|webp|avif|gif)$/i.test(v)) {
          images.push(v);
        }
      }
      if (typeof (d as any).value === "number") totalAmount += (d as any).value;
      if (typeof (d as any).totalAmount === "number") totalAmount += (d as any).totalAmount;
    }
  }
  return {
    collections: Object.keys(related).length,
    docsCount,
    totalAmount,
    sampleImages: images.slice(0, 5),
  };
}

async function findDuplicates(db: FirebaseFirestore.Firestore, base: any) {
  const norm = (s?: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();
  const key = `${norm(base.name)}|${norm(base.city)}|${norm(base.email)}|${norm(base.vat_number || base.cif)}`;
  const all = await db.collection("accounts").limit(3000).get();
  const hits: any[] = [];
  for (const d of all.docs) {
    const a = { id: d.id, ...(d.data() as any) };
    const k = `${norm(a.name)}|${norm(a.city)}|${norm(a.email)}|${norm(a.vat_number || a.cif)}`;
    if (k === key && a.id !== base.id) hits.push(a);
  }
  return hits;
}

/** ---------- route ---------- */
export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: "Falta 'name'" }, { status: 400 });

    const db = getFirestore();
    const matches = await findAccountsByName(name, db);
    if (matches.length === 0) {
      return NextResponse.json({ matches: 0, bundles: [], message: "Sin resultados" });
    }

    const top = await listTopCollections(db);
    const bundles = [];

    for (const m of matches) {
      const accountId = m.id;
      const account = { id: accountId, ...(m.data() as any) };

      // related (todas las colecciones + subcolecciones)
      const related: Record<string, any[]> = {};
      for (const c of top) {
        if (c.id === "accounts") continue;
        const docs = await queryRelated(db, c.id, accountId);
        if (docs.length) related[c.id] = docs;
      }
      Object.assign(related, await readAccountSubcollections(db, accountId));

      // schema (raw) por colección
      const schema: Record<string, any> = {};
      schema["accounts"] = analyzeCollectionDocs([account]);
      for (const [cid, docs] of Object.entries(related)) {
        schema[cid] = analyzeCollectionDocs(docs);
      }

      const metrics = basicMetrics(related);
      const duplicates = await findDuplicates(db, account);

      bundles.push({ account, related, schema, metrics, duplicates });
    }

    return NextResponse.json({ matches: bundles.length, bundles });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
