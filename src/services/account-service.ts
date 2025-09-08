import { db } from '@/lib/firebase';
import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, where, writeBatch, runTransaction } from "firebase/firestore";
import type { Account, AccountFormValues } from '@/types';
import { accountToForm, fromFirestore, toFirestore } from './account-mapper';
import { getTeamMembersFS } from './team-member-service';

const ACCOUNTS_COLLECTION = 'accounts';
const ORDERS_COLLECTION = 'orders';

export const getAccountsFS = async (): Promise<Account[]> => {
  const accountsCol = collection(db, ACCOUNTS_COLLECTION);
  const q = query(accountsCol, orderBy('name', 'asc'));
  const accountSnapshot = await getDocs(q);
  return accountSnapshot.docs.map(docSnap => fromFirestore({ id: docSnap.id, ...docSnap.data() }));
};

export const getAccountByIdFS = async (id: string): Promise<Account | null> => {
  if (!id) {
    console.warn("getAccountByIdFS called with no ID.");
    return null;
  }
  const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);
  const docSnap = await getDoc(accountDocRef);
  if (docSnap.exists()) {
    return fromFirestore({ id: docSnap.id, ...docSnap.data() });
  } else {
    console.warn(`Account with ID ${id} not found in Firestore.`);
    return null;
  }
};

export const addAccountFS = async (data: Partial<Account>): Promise<string> => {
  const fullData: Account = {
    id: '', // Will be assigned by Firestore
    status: 'Pendiente',
    potencial: 'medio',
    leadScore: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
    name: data.name || 'Nombre Desconocido',
    type: data.type || 'HORECA',
  };
  const firestoreData = toFirestore(fullData);
  const docRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateAccountFS = async (id: string, data: Partial<Account>): Promise<void> => {
  const batch = writeBatch(db);
  const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);
  
  const firestoreData = {
      ...toFirestore({ ...data, id } as Account),
      updatedAt: Timestamp.now()
  };
  batch.update(accountDocRef, firestoreData);

  // If salesRepId is part of the update, find the rep's name and update open tasks
  if ('salesRepId' in data && data.salesRepId) {
      const rep = await getDoc(doc(db, 'teamMembers', data.salesRepId));
      if (rep.exists()) {
          const repName = rep.data().name;
          const openTasksQuery = query(
              collection(db, ORDERS_COLLECTION),
              where('accountId', '==', id),
              where('status', 'in', ['Programada', 'Seguimiento'])
          );
          const openTasksSnapshot = await getDocs(openTasksQuery);
          openTasksSnapshot.forEach(taskDoc => {
              batch.update(taskDoc.ref, { salesRep: repName });
          });
      }
  }

  await batch.commit();
};

export const deleteAccountFS = async (id: string): Promise<void> => {
  const batch = writeBatch(db);
  const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);
  batch.delete(accountDocRef);

  const ordersQuery = query(collection(db, ORDERS_COLLECTION), where("accountId", "==", id));
  const ordersSnapshot = await getDocs(ordersQuery);
  ordersSnapshot.forEach(orderDoc => {
      batch.delete(orderDoc.ref);
  });
  await batch.commit();
};
