
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  getDocs,
  query,
  where,
  addDoc,
  writeBatch,
  FieldValue
} from 'firebase-admin/firestore';
import { accountSchema, type AccountFormValues, toSearchName } from '@/lib/schemas/account-schema';
import { fromFirestore } from '@/services/account-mapper';
import type { Account, CrmEvent, Order, TeamMember } from '@/types';
import { getAccountsFS } from '@/services/account-service';
import { getTeamMembersFS } from '@/services/team-member-service';
import { getInteractionsForAccountFS } from '@/services/order-service';
import { getEventsForAccountFS } from '@/services/event-service';


// --- SERVER ACTIONS ---

export async function getAccountDetailsAction(accountId: string): Promise<{
  account: Account | null;
  interactions: Order[];
  events: CrmEvent[];
  allAccounts: Account[];
  allTeamMembers: TeamMember[];
}> {
    if (!accountId) return { account: null, interactions: [], events: [], allAccounts: [], allTeamMembers: [] };

    // Fetch the main account document first.
    const accountDocRef = db.collection('accounts').doc(accountId);
    const accountSnap = await accountDocRef.get();

    if (!accountSnap.exists) {
        return { account: null, interactions: [], events: [], allAccounts: [], allTeamMembers: [] };
    }
    
    const account = fromFirestore({ id: accountSnap.id, ...accountSnap.data() });

    // Fetch all other data in parallel
    const [interactions, events, allAccounts, allTeamMembers] = await Promise.all([
      getInteractionsForAccountFS(accountId, account.name),
      getEventsForAccountFS(accountId),
      getAccountsFS(),
      getTeamMembersFS(['Ventas', 'Admin', 'Clavadista', 'Líder Clavadista']),
    ]);

    return {
      account,
      interactions: JSON.parse(JSON.stringify(interactions)),
      events: JSON.parse(JSON.stringify(events)),
      allAccounts: JSON.parse(JSON.stringify(allAccounts)),
      allTeamMembers: JSON.parse(JSON.stringify(allTeamMembers)),
    };
}


export async function updateAccountAction(accountId: string, data: Partial<Account>): Promise<void> {
  const batch = db.batch();
  const accountDocRef = db.collection('accounts').doc(accountId);

  const firestoreData = { ...toFirestore(data), updatedAt: Timestamp.now() };
  batch.update(accountDocRef, firestoreData);

  // If the account name changes, we must update all related interactions.
  if (data.name) {
    const currentAccountSnap = await accountDocRef.get();
    const currentName = currentAccountSnap.exists() ? currentAccountSnap.data()?.name : null;
    if (currentName && currentName !== data.name) {
      const ordersQuery = db.collection('orders').where("accountId", "==", accountId);
      const ordersSnapshot = await ordersQuery.get();
      ordersSnapshot.forEach(orderDoc => {
        batch.update(orderDoc.ref, { clientName: data.name });
      });
    }
  }

  await batch.commit();
}

/**
 * Creates or updates an account in Firestore.
 * - Validates the data with Zod.
 * - Normalizes the name for searching.
 * - Uses FieldValue.serverTimestamp() for dates.
 */
export async function upsertAccountAction(input: AccountFormValues) {
  const user = { id: 'system', name: 'System' }; // Placeholder for actual user logic
  const data = accountSchema.parse(input);
  const searchName = toSearchName(data.name);

  const payload = {
    name: data.name,
    cif: data.cif ?? null,
    type: data.type,
    phone: data.phone ?? null,
    email: data.email ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    notes: data.notes ?? null,
    ownership: data.ownership,
    distributorId: data.ownership === 'distribuidor' ? (data.distributorId ?? null) : null,
    searchName,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: user.id,
    status: 'lead',
    potencial: 'medio',
    leadScore: 50,
  };

  if (data.id) {
    await db.collection('accounts').doc(data.id).update(payload);
    return { ok: true, id: data.id, op: 'updated' as const };
  } else {
    const ref = await db.collection('accounts').add({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: user.id,
      owner_user_id: user.id,
      responsibleName: user.name,
    });
    return { ok: true, id: ref.id, op: 'created' as const };
  }
}

/**
 * Finds an account by searchName; if it doesn't exist, it creates a minimal one.
 * Returns { id, name, ownership, distributorId }
 */
export async function findOrCreateAccountByName(input: {
  name: string;
  ownership?: "propio" | "distribuidor";
  distributorId?: string | null;
}) {
  const user = { id: 'system', name: 'System' };
  const name = input.name.trim();
  const searchName = toSearchName(name);

  const accountsCollection = db.collection('accounts');
  const q = accountsCollection.where("searchName", "==", searchName).limit(1);
  const snap = await getDocs(q);

  if (!snap.empty) {
    const d = snap.docs[0];
    const x = d.data() as any;
    return { id: d.id, name: x.name as string, ownership: x.ownership ?? "propio", distributorId: x.distributorId ?? null };
  }

  const now = Timestamp.now();
  const ownership = input.ownership ?? "propio";
  const docRef = await addDoc(accountsCollection, {
    name,
    searchName,
    type: "HORECA",
    ownership,
    distributorId: ownership === "distribuidor" ? (input.distributorId ?? null) : null,
    createdAt: now,
    lastUpdated: now,
    createdBy: user.id,
    salesRepId: user.id,
    responsableId: user.id,
    responsableName: user.name,
    status: 'Pendiente',
    accountStage: 'POTENCIAL',
    potencial: 'medio',
    leadScore: 50,
  });

  return { id: docRef.id, name, ownership, distributorId: ownership === "distribuidor" ? (input.distributorId ?? null) : null };
}

