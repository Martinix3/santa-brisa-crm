

'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot,
} from "firebase/firestore";
import type { Account, AccountFormValues, PotencialType } from '@/types';
import { format, parseISO } from 'date-fns';

const ACCOUNTS_COLLECTION = 'accounts';

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
    responsableId: data.responsableId || '',
    brandAmbassadorId: data.brandAmbassadorId || undefined,

    // This now correctly reads the stored status, which can be either a legacy
    // value ('Activo', 'Potencial') or a new calculated one.
    // The cartera-service will overwrite this with the dynamically calculated status.
    status: data.status || 'Activo', // Reverted to Activo as a safe default
    leadScore: 0,
    
    // Legacy fields for compatibility
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
const toFirestore = (data: AccountFormValues, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    nombre: data.name, // Mapping from dialog `name` to `nombre`
    legalName: data.legalName || null,
    cif: data.cif || null,
    type: data.type, 
    // Note: status is calculated, not directly set from the form anymore
    // We only set the legacy status field
    status: data.status,
    iban: data.iban || null,
    mainContactName: data.mainContactName || null,
    mainContactEmail: data.mainContactEmail || null,
    mainContactPhone: data.mainContactPhone || null,
    notes: data.notes || null,
    internalNotes: data.internalNotes || null,
    responsableId: data.salesRepId || null, // Mapping salesRepId to responsableId
    salesRepId: data.salesRepId || null,
  };
  
  // Set default potential if new
  if (isNew) {
      firestoreData.potencial = 'medio' as PotencialType;
  }

  if (data.addressBilling_street || data.addressBilling_city || data.addressBilling_province || data.addressBilling_postalCode) {
    firestoreData.addressBilling = {
      street: data.addressBilling_street || null,
      number: data.addressBilling_number || null,
      city: data.addressBilling_city || null,
      province: data.addressBilling_province || null,
      postalCode: data.addressBilling_postalCode || null,
      country: data.addressBilling_country || "España",
    };
    if (data.addressBilling_city && !firestoreData.ciudad) {
        firestoreData.ciudad = data.addressBilling_city; // Set 'ciudad' from billing city
    }
    Object.keys(firestoreData.addressBilling).forEach(key => {
        if(firestoreData.addressBilling[key] === undefined) firestoreData.addressBilling[key] = null;
    });
  } else {
    firestoreData.addressBilling = null;
  }

  if (data.addressShipping_street || data.addressShipping_city || data.addressShipping_province || data.addressShipping_postalCode) {
    firestoreData.addressShipping = {
      street: data.addressShipping_street || null,
      number: data.addressShipping_number || null,
      city: data.addressShipping_city || null,
      province: data.addressShipping_province || null,
      postalCode: data.addressShipping_postalCode || null,
      country: data.addressShipping_country || "España",
    };
    if (data.addressShipping_city && !firestoreData.ciudad) {
        firestoreData.ciudad = data.addressShipping_city; // Set 'ciudad' from shipping city if not set by billing
    }
     Object.keys(firestoreData.addressShipping).forEach(key => {
        if(firestoreData.addressShipping[key] === undefined) firestoreData.addressShipping[key] = null;
    });
  } else {
    firestoreData.addressShipping = null;
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
  const firestoreData = toFirestore(data as any, false); 
  await updateDoc(accountDocRef, firestoreData);
};

export const deleteAccountFS = async (id: string): Promise<void> => {
  const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);
  await deleteDoc(accountDocRef);
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

