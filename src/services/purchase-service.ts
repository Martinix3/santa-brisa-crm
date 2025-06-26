
'use server';

import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
import { Buffer } from 'buffer';

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
    invoiceFileName: data.invoiceFileName || undefined,
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

const MimeTypeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
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
    const extension = MimeTypeMap[mimeType];

    if (!extension) {
      throw new Error(`Unsupported file type: ${mimeType}. Supported types are PDF, JPG, PNG, WebP.`);
    }

    const buffer = Buffer.from(data, 'base64');
    
    const uniqueFileName = `invoice_${Date.now()}.${extension}`;
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
    const errorMessage = error.code || error.message || "Failed to upload file to storage.";
    throw new Error(`Upload failed: ${errorMessage}`);
  }
}

const toFirestoreSupplier = (data: Partial<SupplierFormValues>, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    cif: data.cif || null,
    contactName: data.contactName || null,
    contactEmail: data.contactEmail || null,
    contactPhone: data.contactPhone || null,
    notes: data.notes || null,
  };

  if (data.address_street || data.address_city || data.address_province || data.address_postalCode) {
    firestoreData.address = {
      street: data.address_street || null,
      number: data.address_number || null,
      city: data.address_city || null,
      province: data.address_province || null,
      postalCode: data.address_postalCode || null,
      country: data.address_country || "España",
    };
    Object.keys(firestoreData.address).forEach(key => {
      if (firestoreData.address[key] === undefined) {
        firestoreData.address[key] = null;
      }
    });
  } else {
    firestoreData.address = null;
  }

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());
  
  return firestoreData;
};


const findOrCreateSupplier = async (data: Partial<PurchaseFormValues>): Promise<string | undefined> => {
    if (!data.supplier) {
        console.warn('findOrCreateSupplier called with an empty supplier name. Aborting.');
        return undefined;
    }
    console.log(`Starting findOrCreateSupplier for: ${data.supplier} (CIF: ${data.supplierCif || 'N/A'})`);

    // Step 1 & 2: Query for existing supplier outside a transaction
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
        return supplierDoc.id;
    }

    // Step 3: If not found, create a new one.
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
        const firestoreData = toFirestoreSupplier(newSupplierData, true);
        const newDocRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), firestoreData);
        console.log(`New supplier created with ID: ${newDocRef.id}`);
        return newDocRef.id;
    } catch (error) {
        console.error("Error creating new supplier:", error);
        throw error; // Re-throw the original error
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

        const purchaseDocRef = doc(collection(db, PURCHASES_COLLECTION));
        
        let invoiceUrl: string | null = null;
        let invoiceFileName: string | null = data.invoiceFileName || null;
        let storagePath: string | null = null;

        if (data.invoiceDataUri && data.invoiceFileName) {
            console.log(`Uploading invoice for new purchase...`);
            const uploadResult = await uploadInvoice(data.invoiceDataUri, purchaseDocRef.id);
            invoiceUrl = uploadResult.downloadUrl;
            storagePath = uploadResult.storagePath;
            console.log(`Invoice uploaded successfully. URL: ${invoiceUrl}`);
        }
        
        const firestoreData = toFirestorePurchase(data, true, supplierId);
        firestoreData.invoiceUrl = invoiceUrl;
        firestoreData.invoiceFileName = invoiceFileName;
        firestoreData.storagePath = storagePath;

        console.log(`Setting new purchase document... ID: ${purchaseDocRef.id}`);
        await setDoc(purchaseDocRef, firestoreData);
        console.log(`Purchase document created successfully.`);
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
    
    let invoiceUrl: string | null = existingData?.invoiceUrl || null;
    let invoiceFileName: string | null = existingData?.invoiceFileName || null;
    let storagePath: string | null = existingData?.storagePath || null;
    const oldStoragePath = existingData?.storagePath || null;

    if (data.invoiceDataUri && data.invoiceFileName) {
       const uploadResult = await uploadInvoice(data.invoiceDataUri, id);
       invoiceUrl = uploadResult.downloadUrl;
       invoiceFileName = data.invoiceFileName;
       storagePath = uploadResult.storagePath;
    }
    
    const firestoreData = toFirestorePurchase(data as PurchaseFormValues, false, supplierId);
    firestoreData.invoiceUrl = invoiceUrl;
    firestoreData.invoiceFileName = invoiceFileName;
    firestoreData.storagePath = storagePath;
    
    await updateDoc(purchaseDocRef, firestoreData);

    if (oldStoragePath && oldStoragePath !== storagePath) {
        const oldFileRef = ref(storage, oldStoragePath);
        await deleteObject(oldFileRef).catch(err => console.error("Failed to delete old invoice file:", err));
    }
  } catch (error) {
    console.error("Failed to update purchase:", error);
    throw error;
  }
};

export const deletePurchaseFS = async (id: string): Promise<void> => {
  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
  const docSnap = await getDoc(purchaseDocRef);
  
  if (docSnap.exists()) {
      const data = fromFirestorePurchase(docSnap);
      if (data.storagePath) {
          const fileRef = ref(storage, data.storagePath);
          await deleteObject(fileRef).catch(err => console.error("Failed to delete invoice file on purchase delete:", err));
      }
  }

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
