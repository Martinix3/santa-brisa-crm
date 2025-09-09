
'use server';

import { adminDb } from '@/lib/firebaseAdmin'; // Use Admin SDK
import { Timestamp } from "firebase-admin/firestore";
import type { Account, AccountFormValues } from '@/types';
import { fromFirestore, toFirestore } from './account-mapper';
import { getTeamMembersFS } from './team-member-service';

const ACCOUNTS_COLLECTION = 'accounts';
const ORDERS_COLLECTION = 'orders';

export const getAccountsFS = async (): Promise<Account[]> => {
  const q = adminDb.collection(ACCOUNTS_COLLECTION).orderBy('name', 'asc');
  const accountSnapshot = await q.get();
  return accountSnapshot.docs.map(docSnap => fromFirestore({ id: docSnap.id, ...docSnap.data() }));
};

export const getAccountByIdFS = async (id: string): Promise<Account | null> => {
  if (!id) {
    console.warn("getAccountByIdFS called with no ID.");
    return null;
  }
  const accountDocRef = adminDb.collection(ACCOUNTS_COLLECTION).doc(id);
  const docSnap = await accountDocRef.get();
  if (docSnap.exists) {
    return fromFirestore({ id: docSnap.id, ...docSnap.data() });
  } else {
    console.warn(`Account with ID ${id} not found in Firestore.`);
    return null;
  }
};

export const addAccountFS = async (data: Partial<Account>): Promise<string> => {
  const fullData: Partial<Account> = {
    accountStage: 'POTENCIAL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
    name: data.name || 'Nombre Desconocido',
    accountType: data.accountType || 'prospect',
  };
  const firestoreData = toFirestore(fullData);
  const docRef = await adminDb.collection(ACCOUNTS_COLLECTION).add(firestoreData);
  return docRef.id;
};

export const updateAccountFS = async (id: string, data: Partial<Account>): Promise<void> => {
  const batch = adminDb.batch();
  const accountDocRef = adminDb.collection(ACCOUNTS_COLLECTION).doc(id);
  
  const firestoreData = {
      ...toFirestore({ ...data, id } as Account),
      updatedAt: Timestamp.now()
  };
  batch.update(accountDocRef, firestoreData);

  // If the account name changes, we must update all related interactions.
  if (data.name) {
      const currentAccountSnap = await accountDocRef.get();
      const currentAccount = currentAccountSnap.exists ? fromFirestore(currentAccountSnap.data()) : null;
      if (currentAccount && currentAccount.name !== data.name) {
          const ordersQuery = adminDb.collection(ORDERS_COLLECTION).where("accountId", "==", id);
          const ordersSnapshot = await ordersQuery.get();
          ordersSnapshot.forEach(orderDoc => {
              batch.update(orderDoc.ref, { clientName: data.name });
          });
      }
  }


  if ('salesRepId' in data && data.salesRepId) {
      const rep = await adminDb.collection('teamMembers').doc(data.salesRepId).get();
      if (rep.exists) {
          const repName = rep.data()?.name;
          const openTasksQuery = adminDb.collection(ORDERS_COLLECTION)
              .where('accountId', '==', id)
              .where('status', 'in', ['Programada', 'Seguimiento']);
          const openTasksSnapshot = await openTasksQuery.get();
          openTasksSnapshot.forEach(taskDoc => {
              batch.update(taskDoc.ref, { salesRep: repName });
          });
      }
  }

  await batch.commit();
};

export const deleteAccountFS = async (id: string): Promise<void> => {
  const batch = adminDb.batch();
  const accountDocRef = adminDb.collection(ACCOUNTS_COLLECTION).doc(id);
  batch.delete(accountDocRef);

  const ordersQuery = adminDb.collection(ORDERS_COLLECTION).where("accountId", "==", id);
  const ordersSnapshot = await ordersQuery.get();
  ordersSnapshot.forEach(orderDoc => {
      batch.delete(orderDoc.ref);
  });
  await batch.commit();
};
