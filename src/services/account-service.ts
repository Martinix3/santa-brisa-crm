

'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot,
  writeBatch, where
} from "firebase/firestore";
import type { Account, AccountFormValues, PotencialType } from '@/types';
import { format, parseISO } from 'date-fns';

const ACCOUNTS_COLLECTION = 'accounts';
const ORDERS_COLLECTION = 'orders'; 

// This function now returns the raw account data from Firestore.
// The business logic (status, leadScore) is handled in cartera-service.
const fromFirestore = (docSnap: DocumentSnapshot): Account => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    nombre: data.nombre ?? data.name ?? data.nombreComercial ?? '',
    ciudad: data.ciudad || undefined,
    potencial: data.potencial || 'bajo',
    responsableId: data.responsableId || data.salesRepId || '',
    brandAmbassadorId: data.brandAmbassadorId || undefined,

    // The 'status' field from Firestore is now considered legacy.
    // The true status is calculated dynamically by cartera-service.
    // We provide a default fallback here.
    status: 'Inactivo',
    leadScore: 0,
    
    legalName: data.legalName || '',
    cif: data.cif || '',
    type: data.type, 
    salesRepId: data.salesRepId || data.responsableId, // Fallback for compatibility
    iban: data.iban || undefined,
    addressBilling: data.addressBilling,
    addressShipping: data.addressShipping,
    mainContactName: data.mainContactName || '',
    mainContactEmail: data.mainContactEmail || '',
    mainContactPhone: data.mainContactPhone || '',
    notes: data.notes || '',
    internalNotes: data.internalNotes || undefined,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : format(new Date(), "yyyy-MM-dd")),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : (typeof data.updatedAt === 'string' ? data.updatedAt : format(new Date(), "yyyy-MM-dd")),
  };
};

// This function is for the dialog, not the new model fully
const toFirestore = (data: Partial<AccountFormValues>, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {};
  
  // Directly map provided fields
  if (data.name) firestoreData.nombre = data.name;
  if (data.legalName !== undefined) firestoreData.legalName = data.legalName || null;
  if (data.cif !== undefined) firestoreData.cif = data.cif || null;
  if (data.type) firestoreData.type = data.type;
  if (data.iban !== undefined) firestoreData.iban = data.iban || null;
  if (data.mainContactName !== undefined) firestoreData.mainContactName = data.mainContactName || null;
  if (data.mainContactEmail !== undefined) firestoreData.mainContactEmail = data.mainContactEmail || null;
  if (data.mainContactPhone !== undefined) firestoreData.mainContactPhone = data.mainContactPhone || null;
  if (data.notes !== undefined) firestoreData.notes = data.notes || null;
  if (data.internalNotes !== undefined) firestoreData.internalNotes = data.internalNotes || null;
  
  if (data.salesRepId !== undefined) {
    firestoreData.responsableId = data.salesRepId || null; // Mapping salesRepId to responsableId
    firestoreData.salesRepId = data.salesRepId || null;
  }
  
  if (isNew) {
      firestoreData.potencial = 'medio' as PotencialType;
  }

  const hasBillingAddress = data.addressBilling_street || data.addressBilling_city || data.addressBilling_province || data.addressBilling_postalCode;
  if (hasBillingAddress) {
    firestoreData.addressBilling = {
      street: data.addressBilling_street || null,
      number: data.addressBilling_number || null,
      city: data.addressBilling_city || null,
      province: data.addressBilling_province || null,
      postalCode: data.addressBilling_postalCode || null,
      country: data.addressBilling_country || "España",
    };
     if (data.addressBilling_city) firestoreData.ciudad = data.addressBilling_city;
  }

  const hasShippingAddress = data.addressShipping_street || data.addressShipping_city || data.addressShipping_province || data.addressShipping_postalCode;
  if (hasShippingAddress) {
    firestoreData.addressShipping = {
      street: data.addressShipping_street || null,
      number: data.addressShipping_number || null,
      city: data.addressShipping_city || null,
      province: data.addressShipping_province || null,
      postalCode: data.addressShipping_postalCode || null,
      country: data.addressShipping_country || "España",
    };
    if (data.addressShipping_city && !firestoreData.ciudad) firestoreData.ciudad = data.addressShipping_city;
  }

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
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
  const batch = writeBatch(db);

  // 1. Get the account document to delete it.
  const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);
  batch.delete(accountDocRef);

  // 2. Query for all orders related to this accountId and add their deletions to the batch.
  const ordersQuery = query(collection(db, ORDERS_COLLECTION), where("accountId", "==", id));
  const ordersSnapshot = await getDocs(ordersQuery);
  ordersSnapshot.forEach(orderDoc => {
      batch.delete(orderDoc.ref);
  });

  try {
      await batch.commit();
      console.log(`Deletion complete for account ${id} and its related interactions.`);
  } catch (error) {
      console.error(`Error during batched deletion for account ${id}:`, error);
      throw error; // Re-throw to be handled by the UI
  }
};

export const initializeMockAccountsInFirestore = async (mockAccounts: any[]) => {
    const accountsCol = collection(db, ACCOUNTS_COLLECTION);
    const snapshot = await getDocs(query(accountsCol, orderBy('createdAt', 'desc')));
    if (snapshot.empty) {
        for (const account of mockAccounts) {
            const { id, createdAt, updatedAt, ...accountData } = account; 
            
            const firestoreReadyData: any = {
                ...accountData,
                createdAt: account.createdAt ? Timestamp.fromDate(parseISO(account.createdAt)) : Timestamp.fromDate(new Date()),
                updatedAt: account.updatedAt ? Timestamp.fromDate(parseISO(account.updatedAt)) : Timestamp.fromDate(new Date()),
                responsableId: account.salesRepId || account.responsableId || null,
            };
            
            Object.keys(firestoreReadyData).forEach(key => {
              if (firestoreReadyData[key] === undefined) {
                  firestoreReadyData[key] = null; 
              }
            });
            await addDoc(accountsCol, firestoreReadyData);
        }
        console.log('Mock accounts initialized in Firestore.');
    } else {
        console.log('Accounts collection is not empty. Skipping initialization.');
    }
};
