
'use server';

import { db } from '@/lib/firebase';
import { adminBucket } from '@/lib/firebaseAdmin';
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
import type { Purchase, PurchaseFormValues } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';

const PURCHASES_COLLECTION = 'purchases';
const SUPPLIERS_COLLECTION = 'suppliers';

const MimeTypeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

async function uploadInvoice(dataUri: string, purchaseId: string) {
  console.log(`Uploading invoice for purchase ID: ${purchaseId} via Admin SDK.`);
  if (!dataUri.startsWith('data:')) throw new Error('Invalid data URI for upload.');
  
  const [meta, base64] = dataUri.split(',');
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? 'application/pdf';
  const ext = MimeTypeMap[mime];

  if (!ext) {
    throw new Error(`Unsupported mime type for upload: ${mime}`);
  }
  
  const path = `invoices/purchases/${purchaseId}/invoice_${Date.now()}.${ext}`;

  const file = adminBucket.file(path);
  try {
    const downloadToken = uuidv4();
    await file.save(Buffer.from(base64, 'base64'), {
      contentType: mime,
      resumable: false,
      metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } }
    });
    console.log(`Admin SDK: Invoice uploaded successfully to: ${path}`);

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${adminBucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;
    return { downloadUrl, storagePath: path };
  } catch(error: any) {
    console.error('Error uploading invoice via Admin SDK:', error);
    throw error;
  }
}

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
    console.info(`Finding or creating supplier: "${data.supplier}"`);

    if (data.supplierCif && data.supplierCif.trim() !== '') {
        console.log(`Searching for supplier by CIF: ${data.supplierCif}`);
        const cifQuery = query(collection(db, SUPPLIERS_COLLECTION), where("cif", "==", data.supplierCif), limit(1));
        const cifSnapshot = await getDocs(cifQuery);
        if (!cifSnapshot.empty) {
            const supplierDoc = cifSnapshot.docs[0];
            console.log(`Found supplier by CIF. ID: ${supplierDoc.id}`);
            return supplierDoc.id;
        }
    }

    console.log(`Searching for supplier by name: "${data.supplier}"`);
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

    console.log(`No existing supplier found. Creating new one for: "${data.supplier}"`);
    try {
        const newSupplierData = {
            name: data.supplier!,
            cif: data.supplierCif || null,
            address: (data.supplierAddress_street || data.supplierAddress_city) ? {
                street: data.supplierAddress_street || null,
                number: data.supplierAddress_number || null,
                city: data.supplierAddress_city || null,
                province: data.supplierAddress_province || null,
                postalCode: data.supplierAddress_postalCode || null,
                country: data.supplierAddress_country || "España",
            } : null,
            contactName: null, contactEmail: null, contactPhone: null,
            notes: "Creado automáticamente desde una compra.",
            createdAt: Timestamp.fromDate(new Date()),
            updatedAt: Timestamp.fromDate(new Date()),
        };

        const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), newSupplierData);
        console.log(`New supplier created with ID: ${docRef.id}`);
        return docRef.id;
    } catch (err) {
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
    console.log('Server Action: addPurchaseFS received payload.');
    try {
        const purchaseId = uuidv4();
        
        if (data.invoiceUrl && data.invoiceUrl.startsWith('data:')) {
          console.log("Data URI found, starting server-side upload...");
          const uploadResult = await uploadInvoice(data.invoiceUrl, purchaseId);
          data.invoiceUrl = uploadResult.downloadUrl;
          data.storagePath = uploadResult.storagePath;
          console.log("Server-side upload complete. URL:", data.invoiceUrl);
        }

        const supplierId = await findOrCreateSupplier(data);
        if (!supplierId) {
            throw new Error("Failed to process supplier. Supplier name might be empty.");
        }
        
        const firestoreData = toFirestorePurchase(data, true, supplierId);
        
        console.log(`Creating new purchase document with pre-generated ID: ${purchaseId}`);
        const purchaseDocRef = doc(db, PURCHASES_COLLECTION, purchaseId);
        await setDoc(purchaseDocRef, firestoreData);
        console.log(`Purchase document created successfully.`);
        return purchaseId;

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
    
    if (data.invoiceUrl && data.invoiceUrl.startsWith('data:')) {
        console.log("New invoice file detected for update.");
        const uploadResult = await uploadInvoice(data.invoiceUrl, id);
        data.invoiceUrl = uploadResult.downloadUrl;
        data.storagePath = uploadResult.storagePath;
        
        if (existingData?.storagePath && existingData.storagePath !== data.storagePath) {
            console.log(`Deleting old invoice file: ${existingData.storagePath}`);
            await adminBucket.file(existingData.storagePath).delete().catch(err => console.error("Failed to delete old invoice file:", err));
        }
    }

    const firestoreData = toFirestorePurchase(data as PurchaseFormValues, false, supplierId);
    
    await updateDoc(purchaseDocRef, firestoreData);
    console.log("Purchase document updated.");

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
          console.log(`Deleting associated invoice file: ${data.storagePath}`);
          try {
            await adminBucket.file(data.storagePath).delete();
            console.log(`Successfully deleted file ${data.storagePath} from Storage.`);
          } catch (error) {
            console.error(`Failed to delete file ${data.storagePath} from Storage. It might have been already deleted.`, error);
          }
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
    }
};
