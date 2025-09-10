import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { toSearchName } from "../lib/schemas/account-schema";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Mantén este nombre exportado (accountOnWrite) para desplegarlo como función:
 * firebase deploy --only functions:accountOnWrite
 */
export const accountOnWrite = functions.firestore
  .document("accounts/{accountId}")
  .onWrite(async (change) => {
    // Si borran el doc, nada que hacer
    if (!change.after.exists) return;

    const after = change.after.data() as any;
    const before = change.before.exists ? (change.before.data() as any) : null;

    const name: string | undefined = after?.name;
    if (!name) return;

    const newSearchName = toSearchName(name);
    const prevSearchName = before?.searchName;

    // Evita bucle si ya está igual
    if (prevSearchName !== newSearchName) {
      await change.after.ref.update({ searchName: newSearchName });
    }
  });
