
'use server';

import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  limit
} from 'firebase/firestore';
import type { Purchase, PurchaseFormValues, SupplierFormValues } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { getSupplierByNameFS, getSupplierByCifFS, addSupplierFS } from './supplier-service';

const PURCHASES_COLLECTION = 'purchases';

const fromFirestorePurchase = (docSnap: any): Purchase => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    supplier: data.supplier || '',
    supplierId: data.supplierId || undefined,
    items: data.items || [],
    subtotal: data.subtotal || 0,
    tax: data.tax || 0,
    shippingCost: data.shippingCost,
    totalAmount: data.totalAmount || 0,
    orderDate: data.orderDate instanceof Timestamp ? format(data.orderDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    status: data.status || 'Borrador',
    invoiceUrl: data.invoiceUrl || undefined,
    invoiceFileName: data.invoiceFileName || undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  };
};

const toFirestorePurchase = (data: Partial<PurchaseFormValues>, isNew: boolean): any => {
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
    shippingCost,
    totalAmount,
    notes: data.notes || null,
  };

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());

  return firestoreData;
};


async function uploadInvoice(
  dataUri: string,
  purchaseId: string
): Promise<{ downloadUrl: string; storagePath: string }> {
  try {
    if (!dataUri.startsWith('data:')) {
      throw new Error('Invalid data URI provided.');
    }
    
    const parts = dataUri.split(',');
    if (parts.length < 2) {
      throw new Error('Malformed data URI.');
    }

    const meta = parts[0];
    const data = parts[1];
    
    const mimeTypeMatch = meta.match(/:(.*?);/);
    if (!mimeTypeMatch || !mimeTypeMatch[1]) {
      throw new Error('Could not determine MIME type from data URI.');
    }
    
    const mimeType = mimeTypeMatch[1];
    const buffer = Buffer.from(data, 'base64');
    
    const fileExtension = mimeType.split('/')[1] || 'bin';
    const uniqueFileName = `invoice_${Date.now()}.${fileExtension.replace(/[^a-zA-Z0-9.]/g, '')}`; // Sanitize extension
    const storagePath = `invoices/purchases/${purchaseId}/${uniqueFileName}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, buffer, {
      contentType: mimeType,
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return {
      downloadUrl,
      storagePath: snapshot.metadata.fullPath,
    };
  } catch (error: any) {
    console.error('Error uploading invoice to Firebase Storage:', error);
    // Provide a more specific error message if available
    const errorMessage = error.code || error.message || "Failed to upload file to storage.";
    throw new Error(`Upload failed: ${errorMessage}`);
  }
}


const findOrCreateSupplier = async (data: Partial<PurchaseFormValues>): Promise<string | undefined> => {
    if (!data.supplier) return undefined;

    let existingSupplier = data.supplierCif ? await getSupplierByCifFS(data.supplierCif) : null;
    if (!existingSupplier) {
        existingSupplier = await getSupplierByNameFS(data.supplier);
    }

    if (existingSupplier) {
        return existingSupplier.id;
    } else {
        const newSupplierData: SupplierFormValues = {
            name: data.supplier,
            cif: data.supplierCif,
            address_street: data.supplierAddress_street,
            address_number: data.supplierAddress_number,
            address_city: data.supplierAddress_city,
            address_province: data.supplierAddress_province,
            address_postalCode: data.supplierAddress_postalCode,
            address_country: data.supplierAddress_country,
        };
        const newSupplierId = await addSupplierFS(newSupplierData);
        return newSupplierId;
    }
}


export const getPurchasesFS = async (): Promise<Purchase[]> => {
  const purchasesCol = collection(db, PURCHASES_COLLECTION);
  const q = query(purchasesCol, orderBy('orderDate', 'desc'));
  const purchaseSnapshot = await getDocs(q);
  return purchaseSnapshot.docs.map(docSnap => fromFirestorePurchase(docSnap));
};


export const addPurchaseFS = async (data: PurchaseFormValues): Promise<string> => {
  const supplierId = await findOrCreateSupplier(data);
  const purchaseDocRef = doc(collection(db, PURCHASES_COLLECTION));
  
  let invoiceUrl: string | null = null;
  let invoiceFileName: string | null = data.invoiceFileName || null;

  if (data.invoiceDataUri && data.invoiceFileName) {
    try {
        const { downloadUrl } = await uploadInvoice(data.invoiceDataUri, purchaseDocRef.id);
        invoiceUrl = downloadUrl;
    } catch (uploadError) {
      console.error("Halting purchase creation due to upload error:", uploadError);
      throw uploadError;
    }
  }
  
  const firestoreData = toFirestorePurchase(data, true);
  firestoreData.supplierId = supplierId;
  firestoreData.invoiceUrl = invoiceUrl;
  firestoreData.invoiceFileName = invoiceFileName;

  await setDoc(purchaseDocRef, firestoreData);
  return purchaseDocRef.id;
};

export const updatePurchaseFS = async (id: string, data: Partial<PurchaseFormValues>): Promise<void> => {
  let supplierId: string | undefined;
  if (data.supplier) {
      supplierId = await findOrCreateSupplier(data);
  }

  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
  const existingDocSnap = await getDoc(purchaseDocRef);
  const existingData = existingDocSnap.exists() ? existingDocSnap.data() : {};
  
  let invoiceUrl: string | null = existingData.invoiceUrl || null;
  let invoiceFileName: string | null = existingData.invoiceFileName || null;

  if (data.invoiceDataUri && data.invoiceFileName) {
     try {
        const { downloadUrl } = await uploadInvoice(data.invoiceDataUri, id);
        invoiceUrl = downloadUrl;
        invoiceFileName = data.invoiceFileName;
     } catch (uploadError) {
        console.error("Halting purchase update due to upload error:", uploadError);
        throw uploadError;
     }
  }
  
  const firestoreData = toFirestorePurchase(data as PurchaseFormValues, false);
  if (supplierId) {
    firestoreData.supplierId = supplierId;
  }
  firestoreData.invoiceUrl = invoiceUrl;
  firestoreData.invoiceFileName = invoiceFileName;
  
  await updateDoc(purchaseDocRef, firestoreData);
};

export const deletePurchaseFS = async (id: string): Promise<void> => {
  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
  await deleteDoc(purchaseDocRef);
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
