

'use server';

import { adminDb as db, adminBucket } from '@/lib/firebaseAdmin';
import type { firestore as adminFirestore } from 'firebase-admin';
import type { Purchase, PurchaseFormValues, Supplier } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const PURCHASES_COLLECTION = 'purchases';
const SUPPLIERS_COLLECTION = 'suppliers';

async function uploadInvoice(dataUri: string, purchaseId: string): Promise<{ downloadUrl: string; storagePath: string }> {
  const [meta, base64] = dataUri.split(',');
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? 'application/pdf';
  const ext = mime.split('/')[1] ?? 'bin';
  const path = `invoices/purchases/${purchaseId}/invoice_${Date.now()}.${ext}`;

  await adminBucket.file(path).save(Buffer.from(base64, 'base64'), {
    contentType: mime,
    resumable: false,
    public: true,
  });

  const url = `https://storage.googleapis.com/${adminBucket.name}/${path}`;
  console.log(`File uploaded to ${path}, public URL: ${url}`);
  return { downloadUrl: url, storagePath: path };
}

const fromFirestorePurchase = (docSnap: adminFirestore.DocumentSnapshot): Purchase => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

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
    orderDate: data.orderDate instanceof adminFirestore.Timestamp ? format(data.orderDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    status: data.status || 'Borrador',
    invoiceUrl: data.invoiceUrl || undefined,
    storagePath: data.storagePath || undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt instanceof adminFirestore.Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof adminFirestore.Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
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
    orderDate: data.orderDate instanceof Date && isValid(data.orderDate) ? adminFirestore.Timestamp.fromDate(data.orderDate) : adminFirestore.Timestamp.fromDate(new Date()),
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
    firestoreData.createdAt = adminFirestore.Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = adminFirestore.Timestamp.fromDate(new Date());

  return firestoreData;
};

const findOrCreateSupplier = async (data: Partial<PurchaseFormValues>): Promise<string | undefined> => {
    if (!data.supplier || data.supplier.trim() === '') {
        console.warn('findOrCreateSupplier called with an empty supplier name. Aborting.');
        return undefined;
    }
    console.info(`Finding or creating supplier: "${data.supplier}"`);
    const suppliersCol = db.collection(SUPPLIERS_COLLECTION);

    if (data.supplierCif && data.supplierCif.trim() !== '') {
        console.log(`Searching for supplier by CIF: ${data.supplierCif}`);
        const cifQuery = suppliersCol.where("cif", "==", data.supplierCif).limit(1);
        const cifSnapshot = await cifQuery.get();
        if (!cifSnapshot.empty) {
            const supplierDoc = cifSnapshot.docs[0];
            console.log(`Found supplier by CIF. ID: ${supplierDoc.id}`);
            return supplierDoc.id;
        }
    }

    console.log(`Searching for supplier by name: "${data.supplier}"`);
    const nameQuery = suppliersCol.where("name", "==", data.supplier).limit(1);
    const nameSnapshot = await nameQuery.get();
    if (!nameSnapshot.empty) {
        const supplierDoc = nameSnapshot.docs[0];
        console.log(`Found supplier by name. ID: ${supplierDoc.id}`);
        if (!supplierDoc.data().cif && data.supplierCif) {
            console.log(`Updating CIF for existing supplier ${supplierDoc.id}`);
            await suppliersCol.doc(supplierDoc.id).update({ cif: data.supplierCif });
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
            createdAt: adminFirestore.Timestamp.fromDate(new Date()),
            updatedAt: adminFirestore.Timestamp.fromDate(new Date()),
        };

        const docRef = await suppliersCol.add(newSupplierData);
        console.log(`New supplier created with ID: ${docRef.id}`);
        return docRef.id;
    } catch (err) {
        console.error('Supplier creation failed', err);
        throw err;
    }
};

export const getPurchasesFS = async (): Promise<Purchase[]> => {
  const purchasesCol = db.collection(PURCHASES_COLLECTION);
  const purchaseSnapshot = await purchasesCol.orderBy('orderDate', 'desc').get();
  return purchaseSnapshot.docs.map(docSnap => fromFirestorePurchase(docSnap));
};

export const addPurchaseFS = async (data: PurchaseFormValues): Promise<string> => {
    try {
        const supplierId = await findOrCreateSupplier(data);
        if (!supplierId) {
            throw new Error("Failed to process supplier. Supplier name might be empty.");
        }
        
        const tempPurchaseRef = db.collection(PURCHASES_COLLECTION).doc();
        const purchaseId = tempPurchaseRef.id;

        if (data.invoiceDataUri) {
            console.log(`Uploading invoice for new purchase ID: ${purchaseId}`);
            const { downloadUrl, storagePath } = await uploadInvoice(data.invoiceDataUri, purchaseId);
            data.invoiceUrl = downloadUrl;
            data.storagePath = storagePath;
        }

        const firestoreData = toFirestorePurchase(data, true, supplierId);
        
        await tempPurchaseRef.set(firestoreData);
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
    if (data.supplier) {
        supplierId = await findOrCreateSupplier(data);
    }

    if (data.invoiceDataUri) {
        console.log(`Uploading new invoice for existing purchase ID: ${id}`);
        const { downloadUrl, storagePath } = await uploadInvoice(data.invoiceDataUri, id);
        data.invoiceUrl = downloadUrl;
        data.storagePath = storagePath;
    }

    const purchaseDocRef = db.collection(PURCHASES_COLLECTION).doc(id);
    const firestoreData = toFirestorePurchase(data as PurchaseFormValues, false, supplierId);
    await purchaseDocRef.update(firestoreData);
    console.log("Purchase document updated.");
  } catch (error) {
    console.error("Failed to update purchase:", error);
    throw error;
  }
};

export const deletePurchaseFS = async (id: string): Promise<void> => {
  console.log(`Attempting to delete purchase document with ID: ${id}`);
  const purchaseDocRef = db.collection(PURCHASES_COLLECTION).doc(id);
  const docSnap = await purchaseDocRef.get();
  
  if (docSnap.exists) {
      const data = fromFirestorePurchase(docSnap);
      if (data.storagePath) {
          try {
            console.log(`Deleting associated file from Storage: ${data.storagePath}`);
            await adminBucket.file(data.storagePath).delete();
            console.log(`File ${data.storagePath} deleted successfully.`);
          } catch(e: any) {
             console.error(`Failed to delete file from Storage at path ${data.storagePath}:`, e.message);
          }
      }
  }

  await purchaseDocRef.delete();
  console.log(`Purchase document ${id} deleted.`);
};


export const initializeMockPurchasesInFirestore = async (mockData: Purchase[]) => {
    const purchasesCol = db.collection(PURCHASES_COLLECTION);
    const snapshot = await purchasesCol.limit(1).get();
    if (snapshot.empty && mockData.length > 0) {
        const batch = db.batch();
        mockData.forEach(purchase => {
            const { id, createdAt, updatedAt, orderDate, ...purchaseData } = purchase;
            
            const firestoreReadyData: any = { ...purchaseData };
            firestoreReadyData.orderDate = orderDate ? adminFirestore.Timestamp.fromDate(parseISO(orderDate)) : adminFirestore.Timestamp.fromDate(new Date());
            firestoreReadyData.createdAt = createdAt ? adminFirestore.Timestamp.fromDate(parseISO(createdAt)) : adminFirestore.Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? adminFirestore.Timestamp.fromDate(parseISO(updatedAt)) : adminFirestore.Timestamp.fromDate(new Date());
            
            const docRef = purchasesCol.doc();
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock purchases initialized in Firestore.');
    }
};
