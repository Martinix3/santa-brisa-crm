// functions/src/triggers/account-onWrite.ts
import * as functions from "firebase-functions";        // v1
import * as admin from "firebase-admin";
import { Change, EventContext } from "firebase-functions";
import { DocumentSnapshot } from "firebase-functions/v1/firestore";
import { toSearchName } from "../lib/schemas/account-schema";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const accountOnWrite = functions.firestore
  .document("accounts/{accountId}")
  .onWrite(async (change: Change<DocumentSnapshot>, _ctx: EventContext) => {
    // Si borran el doc, nada que hacer
    if (!change.after.exists) return null;

    const after = change.after.data() as any;
    const before = change.before.exists ? (change.before.data() as any) : null;

    const name: string | undefined = after?.name;
    if (!name) return null;

    const newSearchName = toSearchName(name);
    const prevSearchName = before?.searchName;

    if (prevSearchName !== newSearchName) {
      await change.after.ref.update({ searchName: newSearchName });
    }
    return null;
  });
