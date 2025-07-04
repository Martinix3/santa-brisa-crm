
'use server';

import { db } from '@/lib/firebase';
import { getAdminBucket } from '@/lib/firebaseAdmin';
import {
  collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, setDoc,
  type DocumentSnapshot, runTransaction,
} from "firebase/firestore";
import type { Purchase, PurchaseFormValues, PromotionalMaterial, LatestPurchaseInfo, PurchaseCategory, Currency } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { updateMaterialStockFS, processMaterialUpdateFromPurchase } from './promotional-material-service';

const PURCHASES_COLLECTION = 'purchases';
const SUPPLIERS_COLLECTION = 'suppliers';

async function uploadInvoice(dataUri: string, purchaseId: string): Promise<{ downloadUrl: string; storagePath: string; contentType: string }> {
  const adminBucket = await getAdminBucket();

  const matches = dataUri.match(/^data:(.+);base64,(.*)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Formato de data URI inválido.');
  }

  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const fileExtension = contentType.split('/')[1] || 'bin';
  const path = `invoices/purchases/${purchaseId}/invoice_${Date.now()}.${fileExtension}`;
  try {
    const file = adminBucket.file(path);
    await file.save(buffer, {
      contentType: contentType,
      resumable: false,
    });
    const url = `https://storage.googleapis.com/${adminBucket.name}/${path}`;
    console.log(`File uploaded to ${path}, public URL: ${url}`);
    return { downloadUrl: url, storagePath: path, contentType: contentType };
  } catch (err: any) {
    console.error(`Error uploading to Firebase Storage at path ${path}:`, err);
    throw new Error(`Failed to upload to storage: ${err.message}`);
  }
}

const fromFirestorePurchase = (docSnap: DocumentSnapshot): Purchase => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    supplier: data.supplier || '',
    supplierId: data.supplierId || undefined,
    categoryId: data.categoryId,
    costCenterIds: data.costCenterIds || [],
    currency: data.currency || 'EUR',
    items: data.items?.map((item: any) => ({ ...item, batchNumber: item.batchNumber || undefined })) || [],
    subtotal: data.subtotal || 0,
    tax: data.tax || 0,
    taxRate: data.taxRate ?? 21,
    shippingCost: data.shippingCost,
    totalAmount: data.totalAmount || 0,
    orderDate: data.orderDate instanceof Timestamp ? format(data.orderDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    status: data.status || 'Borrador',
    invoiceUrl: data.invoiceUrl || undefined,
    invoiceContentType: data.invoiceContentType || undefined,
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
    categoryId: data.categoryId,
    costCenterIds: data.costCenterIds || [],
    currency: data.currency || 'EUR',
    orderDate: data.orderDate instanceof Date && isValid(data.orderDate) ? Timestamp.fromDate(data.orderDate) : Timestamp.fromDate(new Date()),
    status: data.status,
    items: data.items?.map(item => ({ 
        materialId: item.materialId, 
        description: item.description, 
        quantity: item.quantity, 
        unitPrice: item.unitPrice, 
        batchNumber: item.batchNumber || null,
        total: (item.quantity || 0) * (item.unitPrice || 0) 
    })) || [],
    subtotal,
    tax,
    taxRate,
    shippingCost,
    totalAmount,
    notes: data.notes || null,
    invoiceUrl: data.invoiceUrl || null,
    invoiceContentType: data.invoiceContentType || null,
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
    const suppliersCol = collection(db, SUPPLIERS_COLLECTION);

    if (data.supplierCif && data.supplierCif.trim() !== '') {
        console.log(`Searching for supplier by CIF: ${data.supplierCif}`);
        const cifQuery = query(suppliersCol, where("cif", "==", data.supplierCif));
        const cifSnapshot = await getDocs(cifQuery);
        if (!cifSnapshot.empty) {
            const supplierDoc = cifSnapshot.docs[0];
            console.log(`Found supplier by CIF. ID: ${supplierDoc.id}`);
            return supplierDoc.id;
        }
    }

    console.log(`Searching for supplier by name: "${data.supplier}"`);
    const nameQuery = query(suppliersCol, where("name", "==", data.supplier));
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
    try {
        const supplierId = await findOrCreateSupplier(data);
        if (!supplierId) {
            throw new Error("Failed to process supplier. Supplier name might be empty.");
        }
        
        const purchasesCol = collection(db, PURCHASES_COLLECTION);
        const newDocRef = doc(purchasesCol);
        const purchaseId = newDocRef.id;

        if (data.invoiceDataUri) {
            console.log(`Uploading invoice for new purchase ID: ${purchaseId}`);
            const { downloadUrl, storagePath, contentType } = await uploadInvoice(data.invoiceDataUri, purchaseId);
            data.invoiceUrl = downloadUrl;
            data.storagePath = storagePath;
            data.invoiceContentType = contentType;
        }

        const firestoreData = toFirestorePurchase(data, true, supplierId);
        
        await setDoc(newDocRef, firestoreData);

        const completeStatuses = ['Completado', 'Factura Recibida', 'Pagado'];
        if (completeStatuses.includes(data.status)) {
            // This part will be updated in Phase 2 to trigger seedItemBatches
            // For now, we keep the direct stock update for promotional materials
            // const categoryDoc = await getCategoryById(data.categoryId)
            // if (categoryDoc?.kind === 'inventory') {
            //     // ... logic to be added in Phase 2
            // }
        }

        console.log(`New purchase added with ID: ${purchaseId}`);
        return purchaseId;
    } catch (error) {
        console.error("Failed to add purchase:", error);
        throw error;
    }
};

export const updatePurchaseFS = async (id: string, data: Partial<PurchaseFormValues>): Promise<void> => {
  try {
    let supplierId: string | undefined;
    const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
    const existingPurchaseDoc = await getDoc(purchaseDocRef);
    if (!existingPurchaseDoc.exists()) throw new Error("Purchase not found");
    const oldData = fromFirestorePurchase(existingPurchaseDoc);

    if (data.supplier) {
        supplierId = oldData.supplierId;
        if (!supplierId) {
            supplierId = await findOrCreateSupplier(data);
        }
    }

    if (data.invoiceDataUri) { 
        console.log(`Uploading new invoice for existing purchase ID: ${id}`);
        if (oldData.storagePath) {
            try {
              const adminBucket = await getAdminBucket();
              await adminBucket.file(oldData.storagePath).delete();
              console.log(`Old invoice file deleted: ${oldData.storagePath}`);
            } catch (e) {
              console.warn(`Could not delete old invoice file ${oldData.storagePath}, it may not exist or permissions are insufficient.`);
            }
        }
        const { downloadUrl, storagePath, contentType } = await uploadInvoice(data.invoiceDataUri, id);
        data.invoiceUrl = downloadUrl;
        data.storagePath = storagePath;
        data.invoiceContentType = contentType;
    }

    const firestoreData = toFirestorePurchase(data as PurchaseFormValues, false, supplierId);
    await updateDoc(purchaseDocRef, firestoreData);
    
    // Stock update logic will be moved to a trigger in Phase 2
    console.log("Purchase document updated. Stock logic will be handled by triggers in later phases.");
  } catch (error) {
    console.error("Failed to update purchase:", error);
    throw error;
  }
};

export const deletePurchaseFS = async (id: string): Promise<void> => {
  console.log(`Attempting to delete purchase document with ID: ${id}`);
  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
  const docSnap = await getDoc(purchaseDocRef);
  
  if (docSnap.exists()) {
      const data = fromFirestorePurchase(docSnap);
      // Stock adjustment on deletion will be handled by triggers in Phase 2
      
      if (data.storagePath) {
          try {
            const adminBucket = await getAdminBucket();
            console.log(`Deleting associated file from Storage: ${data.storagePath}`);
            await adminBucket.file(data.storagePath).delete();
            console.log(`File ${data.storagePath} deleted successfully.`);
          } catch(e: any) {
             console.error(`Failed to delete file from Storage at path ${data.storagePath}:`, e.message);
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
        for (const purchase of mockData) {
            const { id, createdAt, updatedAt, orderDate, ...purchaseData } = purchase;
            
            const firestoreReadyData: any = { ...purchaseData };
            firestoreReadyData.orderDate = orderDate ? Timestamp.fromDate(parseISO(orderDate)) : Timestamp.fromDate(new Date());
            firestoreReadyData.createdAt = createdAt ? Timestamp.fromDate(parseISO(createdAt)) : Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? Timestamp.fromDate(parseISO(updatedAt)) : Timestamp.fromDate(new Date());
            
            await addDoc(purchasesCol, firestoreReadyData);
        }
        console.log('Mock purchases initialized in Firestore.');
    }
};
