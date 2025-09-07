

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot,
  writeBatch, where, increment
} from "firebase/firestore";
import type { Account, AccountFormValues, PotencialType } from '@/types';
import { format, parseISO } from 'date-fns';

const ACCOUNTS_COLLECTION = 'accounts';
const ORDERS_COLLECTION = 'orders'; 

const fromFirestore = (docSnap: DocumentSnapshot): Account => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    nombre: data.nombre ?? data.name ?? data.nombreComercial ?? 'Nombre no disponible',
    type: data.type ?? 'Otro', 
    status: 'Inactivo', // Default fallback, calculated later
    leadScore: 0,
    
    // --- New Fields ---
    name: data.name ?? data.nombre ?? '',
    channel: data.channel,
    distribution_type: data.distribution_type,
    owner_user_id: data.owner_user_id || data.salesRepId || data.responsableId,
    vat_number: data.vat_number || data.cif,
    billing_address: data.billing_address || data.addressBilling,
    shipping_address: data.shipping_address || data.addressShipping,
    city: data.city || data.addressBilling?.city || data.addressShipping?.city,
    region: data.region || data.addressBilling?.province || data.addressShipping?.province,
    country: data.country || data.addressBilling?.country || 'España',
    sb_score: data.sb_score,
    next_action: data.next_action,
    next_action_date: data.next_action_date,
    
    // --- Legacy Fields for compatibility ---
    ciudad: data.ciudad || data.addressBilling?.city || data.addressShipping?.city,
    potencial: data.potencial || 'bajo',
    responsableId: data.responsableId || data.salesRepId || '',
    brandAmbassadorId: data.brandAmbassadorId || undefined,
    distributorId: data.distributorId || undefined,
    legalName: data.legalName || '',
    cif: data.cif || '',
    salesRepId: data.salesRepId || data.responsableId,
    embajadorId: data.embajadorId,
    iban: data.iban || undefined,
    addressBilling: data.addressBilling,
    addressShipping: data.addressShipping,
    mainContactName: data.mainContactName || '',
    mainContactEmail: data.mainContactEmail || '',
    mainContactPhone: data.mainContactPhone || '',
    notes: data.notes || '',
    internalNotes: data.internalNotes || undefined,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
    primer_pedido_fecha: data.primer_pedido_fecha ? (data.primer_pedido_fecha instanceof Timestamp ? data.primer_pedido_fecha.toDate().toISOString() : data.primer_pedido_fecha) : undefined,
    segundo_pedido_fecha: data.segundo_pedido_fecha ? (data.segundo_pedido_fecha instanceof Timestamp ? data.segundo_pedido_fecha.toDate().toISOString() : data.segundo_pedido_fecha) : undefined,
    total_orders_count: 0,
  };
};

const toFirestore = (data: Partial<AccountFormValues>, isNew: boolean): any => {
    const firestoreData: { [key: string]: any } = {};

    if (data.name) firestoreData.nombre = data.name;
    if (data.type) firestoreData.type = data.type;
    
    firestoreData.legalName = data.legalName || null;
    firestoreData.cif = data.cif || null;
    firestoreData.iban = data.iban || null;
    firestoreData.distributorId = data.distributorId || null;
    firestoreData.mainContactName = data.mainContactName || null;
    firestoreData.mainContactEmail = data.mainContactEmail || null;
    firestoreData.mainContactPhone = data.mainContactPhone || null;
    firestoreData.notes = data.notes || null;
    firestoreData.internalNotes = data.internalNotes || null;
    firestoreData.salesRepId = data.salesRepId || null;
    firestoreData.responsableId = data.salesRepId || null;

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
    const batch = writeBatch(db);
    const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);

    const firestoreData = toFirestore(data, false);
    batch.update(accountDocRef, firestoreData);
    
    if ('salesRepId' in data) {
        let newRepName: string | null = null;
        if (data.salesRepId) {
            const repDoc = await getDoc(doc(db, 'teamMembers', data.salesRepId));
            if (repDoc.exists()) {
                newRepName = repDoc.data().name;
            } else {
                console.warn(`Could not find team member with ID: ${data.salesRepId}`);
                newRepName = 'Asignado a ID no válido';
            }
        } 

        const openTasksQuery = query(
            collection(db, ORDERS_COLLECTION),
            where('accountId', '==', id),
            where('status', 'in', ['Programada', 'Seguimiento'])
        );
        
        try {
            const openTasksSnapshot = await getDocs(openTasksQuery);

            openTasksSnapshot.forEach(taskDoc => {
                batch.update(taskDoc.ref, { 
                    salesRep: newRepName,
                    lastUpdated: Timestamp.now()
                });
            });
        } catch (error) {
             console.error("Error querying for open tasks to update salesRep:", error);
             throw new Error("Failed to query open tasks for updating.");
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

  try {
      await batch.commit();
      console.log(`Deletion complete for account ${id} and its related interactions.`);
  } catch (error) {
      console.error(`Error during batched deletion for account ${id}:`, error);
      throw error;
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

export const incrementOrderCountFS = async (accountId: string) => {
    if (!accountId) return;
    const accountRef = doc(db, 'accounts', accountId);
    await updateDoc(accountRef, {
        total_orders_count: increment(1),
        updatedAt: Timestamp.now()
    });
};
