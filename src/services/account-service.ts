
"use client";

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import type { Account, AccountFormValues } from '@/types';
import { format, parseISO } from 'date-fns';

const ACCOUNTS_COLLECTION = 'accounts';

// Helper para convertir datos de Firestore a tipo Account (UI)
const fromFirestore = (docSnap: any): Account => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || '',
    legalName: data.legalName || '',
    cif: data.cif || '',
    type: data.type, 
    status: data.status,
    addressBilling: data.addressBilling || '',
    addressShipping: data.addressShipping || '',
    mainContactName: data.mainContactName || '',
    mainContactEmail: data.mainContactEmail || '',
    mainContactPhone: data.mainContactPhone || '',
    notes: data.notes || '',
    salesRepId: data.salesRepId || undefined, 
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : format(new Date(), "yyyy-MM-dd")),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : (typeof data.updatedAt === 'string' ? data.updatedAt : format(new Date(), "yyyy-MM-dd")),
  };
};

// Helper para convertir datos de AccountFormValues a lo que se guarda en Firestore
const toFirestore = (data: Partial<AccountFormValues>, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {};

  // Copia solo los campos definidos en AccountFormValues para evitar campos extra
  (Object.keys(data) as Array<keyof AccountFormValues>).forEach(key => {
    if (data[key] !== undefined && data[key] !== "") {
      firestoreData[key] = data[key];
    } else if (key === 'salesRepId' && data[key] === undefined) {
      firestoreData[key] = null; 
    } else if (data[key] === "" && (key === 'legalName' || key === 'addressBilling' || key === 'addressShipping' || key === 'mainContactName' || key === 'mainContactEmail' || key === 'mainContactPhone' || key === 'notes')) {
        firestoreData[key] = null; // Convertir strings vacíos opcionales a null
    }
  });


  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
    if (!firestoreData.name) firestoreData.name = "Nombre no especificado";
    if (!firestoreData.cif) firestoreData.cif = `AUTOGEN_${Date.now()}`;
    if (!firestoreData.type) firestoreData.type = "Otro";
    if (!firestoreData.status) firestoreData.status = "Potencial";
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());

  return firestoreData;
};


export const getAccountsFS = async (): Promise<Account[]> => {
  const accountsCol = collection(db, ACCOUNTS_COLLECTION);
  const q = query(accountsCol, orderBy('createdAt', 'desc'));
  const accountSnapshot = await getDocs(q);
  const accountList = accountSnapshot.docs.map(docSnap => fromFirestore(docSnap));
  return accountList;
};

export const getAccountByIdFS = async (id: string): Promise<Account | null> => {
  if (!id) {
    console.warn("getAccountByIdFS called with no ID.");
    return null;
  }
  const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);
  const docSnap = await getDoc(accountDocRef);
  if (docSnap.exists()) {
    return fromFirestore(docSnap);
  } else {
    console.warn(`Account with ID ${id} not found in Firestore.`);
    return null;
  }
};

export const addAccountFS = async (data: AccountFormValues): Promise<string> => {
  const firestoreData = toFirestore(data, true);
  const docRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateAccountFS = async (id: string, data: Partial<AccountFormValues>): Promise<void> => {
  const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);
  const firestoreData = toFirestore(data, false); 
  await updateDoc(accountDocRef, firestoreData);
};

export const deleteAccountFS = async (id: string): Promise<void> => {
  const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);
  await deleteDoc(accountDocRef);
};

export const initializeMockAccountsInFirestore = async (mockAccounts: Account[]) => {
    const accountsCol = collection(db, ACCOUNTS_COLLECTION);
    const snapshot = await getDocs(query(accountsCol));
    if (snapshot.empty) {
        const batch = writeBatch(db);
        mockAccounts.forEach(account => {
            const { id, ...accountData } = account; 
            const firestoreReadyData: any = {
                ...accountData,
                createdAt: account.createdAt ? Timestamp.fromDate(parseISO(account.createdAt)) : Timestamp.fromDate(new Date()),
                updatedAt: account.updatedAt ? Timestamp.fromDate(parseISO(account.updatedAt)) : Timestamp.fromDate(new Date()),
                salesRepId: account.salesRepId || null, 
            };
            
            Object.keys(firestoreReadyData).forEach(key => {
              if (firestoreReadyData[key] === undefined || (typeof firestoreReadyData[key] === 'string' && firestoreReadyData[key].trim() === '')) {
                if (key !== 'salesRepId' && key !== 'notes' && key !== 'legalName' && key !== 'addressBilling' && key !== 'addressShipping' && key !== 'mainContactName' && key !== 'mainContactEmail' && key !== 'mainContactPhone') {
                  delete firestoreReadyData[key];
                } else if (firestoreReadyData[key] === undefined || firestoreReadyData[key] === '') {
                    firestoreReadyData[key] = null; 
                }
              }
            });
            const docRef = doc(accountsCol); 
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock accounts initialized in Firestore.');
    } else {
        console.log('Accounts collection is not empty. Skipping initialization.');
    }
};
