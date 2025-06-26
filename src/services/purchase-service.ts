
'use server';

import { db } from '@/lib/firebase';
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  writeBatch,
  where,
  limit,
} from 'firebase/firestore';
import type { Purchase, PurchaseFormValues, SupplierFormValues } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const PURCHASES_COLLECTION = 'purchases';
const SUPPLIERS_COLLECTION = 'suppliers';

const fromFirestorePurchase = (docSnap: any): Purchase => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    supplier: data.supplier || '',
    supplierId: data.supplierId || undefined,
    items: data.items || [],
    subtotal: data.subtotal || 0,
    tax: data.tax || 0,
    taxRate: data.taxRate ?? 21,
    shippingCost: data.shippingCost,
    totalAmount: data.totalAmount || 0,
    orderDate: data.orderDate instanceof Timestamp ? format(data.orderDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    status: data.status || 'Borrador',
    invoiceUrl: data.invoiceUrl || undefined,
    storagePath: data.storagePath || undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  };
};

const toFirestorePurchase = (data: Partial<PurchaseFormValues>, isNew: boolean, supplierId?: string): any => {
  const subtotal = data.items?.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0) || 0;
  const shippingCost = data.shippingCost || 0;
  const subtotalWithShipping = subtotal + shippingCost;
  const taxRate = data.taxRate !== undefined ? data.taxRate : 21;
  const tax = subtotalWithShipping * (taxRate / 100);
  const totalAmount = subtotalWithShipping + tax;

  const firestoreData: { [key: string]: any } = {
    supplier: data.supplier,
    orderDate: data.orderDate instanceof Date && isValid(data.orderDate) ? Timestamp.fromDate(data.orderDate) : Timestamp.fromDate(new Date()),
    status: data.status,
    items: data.items?.map(item => ({...item, total: (item.quantity || 0) * (item.unitPrice || 0)})) || [],
    subtotal,
    tax,
    taxRate,
    shippingCost,
    totalAmount,
    notes: data.notes || null,
    invoiceUrl: data.invoiceUrl || null,
    storagePath: data.storagePath || null,
  };

  if (supplierId) {
    firestoreData.supplierId = supplierId;
  }

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());

  return firestoreData;
};

const findOrCreateSupplier = async (data: Partial<PurchaseFormValues>): Promise<string | undefined> => {
    if (!data.supplier || data.supplier.trim() === '') {
        console.warn('findOrCreateSupplier called with an empty supplier name. Aborting.');
        return undefined;
    }
    console.info(`Finding or creating supplier: ${data.supplier}`);

    if (data.supplierCif) {
        console.log(`Searching for supplier by CIF: ${data.supplierCif}`);
        const cifQuery = query(collection(db, SUPPLIERS_COLLECTION), where("cif", "==", data.supplierCif), limit(1));
        const cifSnapshot = await getDocs(cifQuery);
        if (!cifSnapshot.empty) {
            const supplierDoc = cifSnapshot.docs[0];
            console.log(`Found supplier by CIF. ID: ${supplierDoc.id}`);
            return supplierDoc.id;
        }
    }

    console.log(`Searching for supplier by name: ${data.supplier}`);
    const nameQuery = query(collection(db, SUPPLIERS_COLLECTION), where("name", "==", data.supplier), limit(1));
    const nameSnapshot = await getDocs(nameQuery);
    if (!nameSnapshot.empty) {
        const supplierDoc = nameSnapshot.docs[0];
        console.log(`Found supplier by name. ID: ${supplierDoc.id}`);
        if (!supplierDoc.data().cif && data.supplierCif) {
            console.log(`Updating CIF for existing supplier ${supplierDoc.id}`);
            await updateDoc(doc(db, SUPPLIERS_COLLECTION, supplierDoc.id), { cif: data.supplierCif });
        }
        return supplierDoc.id;
    }

    console.log(`No existing supplier found. Creating new one for: ${data.supplier}`);
    try {
        const newSupplierData: SupplierFormValues = {
            name: data.supplier!,
            cif: data.supplierCif,
            address_street: data.supplierAddress_street,
            address_number: data.supplierAddress_number,
            address_city: data.supplierAddress_city,
            address_province: data.supplierAddress_province,
            address_postalCode: data.supplierAddress_postalCode,
            address_country: data.supplierAddress_country,
        };
        const toFirestoreSupplier = (data: Partial<SupplierFormValues>, isNew: boolean): any => {
            const firestoreData: { [key: string]: any } = {
                name: data.name, cif: data.cif || null, contactName: data.contactName || null,
                contactEmail: data.contactEmail || null, contactPhone: data.contactPhone || null, notes: data.notes || null,
            };
            if (data.address_street || data.address_city || data.address_province || data.address_postalCode) {
                firestoreData.address = {
                street: data.address_street || null, number: data.address_number || null, city: data.address_city || null,
                province: data.address_province || null, postalCode: data.address_postalCode || null, country: data.address_country || "España",
                };
                Object.keys(firestoreData.address).forEach(key => { if (firestoreData.address[key] === undefined) { firestoreData.address[key] = null; } });
            } else { firestoreData.address = null; }
            if (isNew) { firestoreData.createdAt = Timestamp.fromDate(new Date()); }
            firestoreData.updatedAt = Timestamp.fromDate(new Date());
            return firestoreData;
        };
        const firestoreData = toFirestoreSupplier(newSupplierData, true);
        const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), firestoreData);
        console.log(`New supplier created with ID: ${docRef.id}`);
        return docRef.id;
    } catch (err: any) {
        console.error('Supplier creation failed', err);
        throw err;
    }
};

export const getPurchasesFS = async (): Promise<Purchase[]> => {
  const purchasesCol = collection(db, PURCHASES_COLLECTION);
  const q = query(purchasesCol, orderBy('orderDate', 'desc'));
  const purchaseSnapshot = await getDocs(q);
  return purchaseSnapshot.docs.map(docSnap => fromFirestorePurchase(docSnap));
};


export const addPurchaseFS = async (data: PurchaseFormValues): Promise<string> => {
    console.log('Payload arriving at addPurchaseFS:', data);
    try {
        const supplierId = await findOrCreateSupplier(data);

        if (!supplierId) {
            throw new Error("Failed to find or create supplier.");
        }
        
        const firestoreData = toFirestorePurchase(data, true, supplierId);
        
        console.log(`Creating new purchase document...`);
        const purchaseDocRef = await addDoc(collection(db, PURCHASES_COLLECTION), firestoreData);
        console.log(`Purchase document created successfully with ID: ${purchaseDocRef.id}`);
        return purchaseDocRef.id;

    } catch (error) {
        console.error("Failed to add purchase:", error);
        throw error;
    }
};

export const updatePurchaseFS = async (id: string, data: Partial<PurchaseFormValues>): Promise<void> => {
  try {
    let supplierId: string | undefined;
    if (data.supplier) {
        supplierId = await findOrCreateSupplier(data);
    }

    const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
    const existingDocSnap = await getDoc(purchaseDocRef);
    const existingData = existingDocSnap.exists() ? fromFirestorePurchase(existingDocSnap) : null;
    
    // Check if the invoice file is being changed.
    const oldStoragePath = existingData?.storagePath;
    const newStoragePath = data.storagePath;

    const firestoreData = toFirestorePurchase(data as PurchaseFormValues, false, supplierId);
    
    await updateDoc(purchaseDocRef, firestoreData);
    console.log("Purchase document updated.");

    // If a new file was uploaded (new path exists) and it's different from the old one, delete the old one.
    if (oldStoragePath && newStoragePath && oldStoragePath !== newStoragePath) {
        console.log("Deleting old invoice file from client-side request:", oldStoragePath);
        const storage = getStorage();
        const oldFileRef = storageRef(storage, oldStoragePath);
        await deleteObject(oldFileRef).catch(err => console.error("Failed to delete old invoice file:", err));
        console.log("Old invoice file deleted.");
    }
  } catch (error) {
    console.error("Failed to update purchase:", error);
    throw error;
  }
};

export const deletePurchaseFS = async (id: string): Promise<void> => {
  console.log(`Attempting to delete purchase with ID: ${id}`);
  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
  const docSnap = await getDoc(purchaseDocRef);
  
  if (docSnap.exists()) {
      const data = fromFirestorePurchase(docSnap);
      if (data.storagePath) {
          console.log(`A client-side request will be needed to delete associated invoice file: ${data.storagePath}`);
          // We can't delete from the server without admin sdk.
          // The deletion should be triggered from the client-side, or use a cloud function.
          // For now, we just delete the firestore document.
      }
  }

  await deleteDoc(purchaseDocRef);
  console.log(`Purchase document ${id} deleted.`);
};


export const initializeMockPurchasesInFirestore = async (mockData: Purchase[]) => {
    const purchasesCol = collection(db, PURCHASES_COLLECTION);
    const snapshot = await getDocs(query(purchasesCol));
    if (snapshot.empty && mockData.length > 0) {
        const batch = writeBatch(db);
        mockData.forEach(purchase => {
            const { id, createdAt, updatedAt, orderDate, ...purchaseData } = purchase;
            
            const firestoreReadyData: any = { ...purchaseData };
            firestoreReadyData.orderDate = orderDate ? Timestamp.fromDate(parseISO(orderDate)) : Timestamp.fromDate(new Date());
            firestoreReadyData.createdAt = createdAt ? Timestamp.fromDate(parseISO(createdAt)) : Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? Timestamp.fromDate(parseISO(updatedAt)) : Timestamp.fromDate(new Date());
            
            const docRef = doc(purchasesCol);
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock purchases initialized in Firestore.');
    } else if (mockData.length === 0) {
        // console.log('No mock purchases to seed.');
    } else {
        // console.log('Purchases collection is not empty. Skipping initialization.');
    }
};
