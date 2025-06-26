

'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import type { firestore as adminFirestore } from 'firebase-admin';
import type { Account, AccountFormValues, AddressDetails } from '@/types';
import { format, parseISO } from 'date-fns';

const ACCOUNTS_COLLECTION = 'accounts';

const fromFirestore = (docSnap: adminFirestore.DocumentSnapshot): Account => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    name: data.name || '',
    legalName: data.legalName || '',
    cif: data.cif || '',
    type: data.type, 
    status: data.status,
    addressBilling: data.addressBilling,
    addressShipping: data.addressShipping,
    mainContactName: data.mainContactName || '',
    mainContactEmail: data.mainContactEmail || '',
    mainContactPhone: data.mainContactPhone || '',
    notes: data.notes || '',
    internalNotes: data.internalNotes || undefined,
    salesRepId: data.salesRepId || undefined, 
    createdAt: data.createdAt instanceof adminFirestore.Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : format(new Date(), "yyyy-MM-dd")),
    updatedAt: data.updatedAt instanceof adminFirestore.Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : (typeof data.updatedAt === 'string' ? data.updatedAt : format(new Date(), "yyyy-MM-dd")),
  };
};

const toFirestore = (data: AccountFormValues & {
    addressBilling_street?: string, addressBilling_number?: string, addressBilling_city?: string, addressBilling_province?: string, addressBilling_postalCode?: string, addressBilling_country?: string,
    addressShipping_street?: string, addressShipping_number?: string, addressShipping_city?: string, addressShipping_province?: string, addressShipping_postalCode?: string, addressShipping_country?: string,
}, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    legalName: data.legalName || null,
    cif: data.cif || null,
    type: data.type,
    status: data.status,
    mainContactName: data.mainContactName || null,
    mainContactEmail: data.mainContactEmail || null,
    mainContactPhone: data.mainContactPhone || null,
    notes: data.notes || null,
    internalNotes: data.internalNotes || null,
    salesRepId: data.salesRepId || null,
  };

  if (data.addressBilling_street || data.addressBilling_city || data.addressBilling_province || data.addressBilling_postalCode) {
    firestoreData.addressBilling = {
      street: data.addressBilling_street || null,
      number: data.addressBilling_number || null,
      city: data.addressBilling_city || null,
      province: data.addressBilling_province || null,
      postalCode: data.addressBilling_postalCode || null,
      country: data.addressBilling_country || "España",
    };
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
     Object.keys(firestoreData.addressShipping).forEach(key => {
        if(firestoreData.addressShipping[key] === undefined) firestoreData.addressShipping[key] = null;
    });
  } else {
    firestoreData.addressShipping = null;
  }

  if (isNew) {
    firestoreData.createdAt = adminFirestore.Timestamp.fromDate(new Date());
    if (!firestoreData.name) firestoreData.name = "Nombre no especificado";
    if (!firestoreData.type) firestoreData.type = "Otro";
    if (!firestoreData.status) firestoreData.status = "Potencial";
  }
  firestoreData.updatedAt = adminFirestore.Timestamp.fromDate(new Date());

  return firestoreData;
};


export const getAccountsFS = async (): Promise<Account[]> => {
  const accountsCol = db.collection(ACCOUNTS_COLLECTION);
  const accountSnapshot = await accountsCol.orderBy('createdAt', 'desc').get();
  const accountList = accountSnapshot.docs.map(docSnap => fromFirestore(docSnap));
  return accountList;
};

export const getAccountByIdFS = async (id: string): Promise<Account | null> => {
  if (!id) {
    console.warn("getAccountByIdFS called with no ID.");
    return null;
  }
  const accountDocRef = db.collection(ACCOUNTS_COLLECTION).doc(id);
  const docSnap = await accountDocRef.get();
  if (docSnap.exists) {
    return fromFirestore(docSnap);
  } else {
    console.warn(`Account with ID ${id} not found in Firestore.`);
    return null;
  }
};

export const addAccountFS = async (data: AccountFormValues & {
    addressBilling_street?: string, addressBilling_number?: string, addressBilling_city?: string, addressBilling_province?: string, addressBilling_postalCode?: string, addressBilling_country?: string,
    addressShipping_street?: string, addressShipping_number?: string, addressShipping_city?: string, addressShipping_province?: string, addressShipping_postalCode?: string, addressShipping_country?: string,
}): Promise<string> => {
  const firestoreData = toFirestore(data, true);
  const docRef = await db.collection(ACCOUNTS_COLLECTION).add(firestoreData);
  return docRef.id;
};

export const updateAccountFS = async (id: string, data: Partial<AccountFormValues & {
    addressBilling_street?: string, addressBilling_number?: string, addressBilling_city?: string, addressBilling_province?: string, addressBilling_postalCode?: string, addressBilling_country?: string,
    addressShipping_street?: string, addressShipping_number?: string, addressShipping_city?: string, addressShipping_province?: string, addressShipping_postalCode?: string, addressShipping_country?: string,
}>): Promise<void> => {
  const accountDocRef = db.collection(ACCOUNTS_COLLECTION).doc(id);
  const firestoreData = toFirestore(data as any, false); 
  await accountDocRef.update(firestoreData);
};

export const deleteAccountFS = async (id: string): Promise<void> => {
  const accountDocRef = db.collection(ACCOUNTS_COLLECTION).doc(id);
  await accountDocRef.delete();
};

export const initializeMockAccountsInFirestore = async (mockAccounts: Account[]) => {
    const accountsCol = db.collection(ACCOUNTS_COLLECTION);
    const snapshot = await accountsCol.limit(1).get();
    if (snapshot.empty) {
        const batch = db.batch();
        mockAccounts.forEach(account => {
            const { id, createdAt, updatedAt, addressBilling, addressShipping, ...accountData } = account; 
            
            const firestoreReadyData: any = {
                ...accountData,
                createdAt: account.createdAt ? adminFirestore.Timestamp.fromDate(parseISO(account.createdAt)) : adminFirestore.Timestamp.fromDate(new Date()),
                updatedAt: account.updatedAt ? adminFirestore.Timestamp.fromDate(parseISO(account.updatedAt)) : adminFirestore.Timestamp.fromDate(new Date()),
                salesRepId: account.salesRepId || null,
                addressBilling: addressBilling || null,
                addressShipping: addressShipping || null,
            };
            
            Object.keys(firestoreReadyData).forEach(key => {
              if (firestoreReadyData[key] === undefined && key !== 'salesRepId' && key !== 'notes' && key !== 'internalNotes' && key !== 'legalName' && key !== 'mainContactName' && key !== 'mainContactEmail' && key !== 'mainContactPhone' && key !== 'addressBilling' && key !== 'addressShipping') {
                  delete firestoreReadyData[key];
              } else if (firestoreReadyData[key] === undefined) {
                  firestoreReadyData[key] = null; 
              }
            });
            const docRef = accountsCol.doc(); 
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock accounts initialized in Firestore.');
    } else {
        console.log('Accounts collection is not empty. Skipping initialization.');
    }
};
