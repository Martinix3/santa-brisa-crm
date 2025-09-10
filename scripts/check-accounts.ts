// npx tsx scripts/check-accounts.ts
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { toSearchName } from "../src/lib/schemas/account-schema";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

type Problem = { id: string; issues: string[] };

(async () => {
  const snap = await db.collection("accounts").get();
  const problems: Problem[] = [];

  for (const doc of snap.docs) {
    const a = doc.data();
    const issues: string[] = [];

    // createdAt/updatedAt
    for (const f of ["createdAt","updatedAt"]) {
      const v = a[f];
      if (!v) issues.push(`${f} ausente`);
      else if (!(v instanceof Timestamp)) issues.push(`${f} no es Timestamp`);
    }

    // stage/status
    if (a.status) issues.push("campo legacy 'status' presente");
    if (!a.stage) issues.push("stage vacío");
    
    // searchName
    const expected = toSearchName(a.name || "");
    if (!a.searchName) issues.push("searchName vacío");
    else if (a.searchName !== expected) issues.push(`searchName mal calculado ('${a.searchName}' vs '${expected}')`);

    // tags
    if (Array.isArray(a.tags)) {
      const set = new Set(a.tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean));
      if (set.size !== a.tags.length) issues.push("tags duplicadas o sucias");
    }

    // address
    if (a.address && typeof a.address === "object") {
      const { city } = a.address;
      if (city && city !== city.toString().trim()) issues.push("address.city con espacios/formatos raros");
    }

    if (issues.length) problems.push({ id: doc.id, issues });
  }

  console.log(`Analizadas: ${snap.size}. Con problemas: ${problems.length}`);
  for (const p of problems.slice(0, 50)) {
    console.log(`- ${p.id}: ${p.issues.join(" | ")}`);
  }
  if (problems.length > 50) console.log(`... y ${problems.length - 50} más`);
})();
