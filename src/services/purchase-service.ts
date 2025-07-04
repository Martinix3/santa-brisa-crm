
'use server';

import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, type DocumentReference, getDoc, query, where, getDocs
} from "firebase/firestore";
import type { Purchase, PurchaseFormValues, PurchaseFirestorePayload } from '@/types';
import { fromFirestorePurchase, toFirestorePurchase } from './utils/firestore-converters';
import { findOrCreateSupplier } from './supplier-service';
import { uploadInvoice } from './storage-service';
import { updateStockForPurchase } from './stock-service';

const PURCHASES_COLLECTION = 'purchases';

export const getPurchasesFS = async (): Promise<Purchase[]> => {
  const purchasesCol = collection(db, PURCHASES_COLLECTION);
  const q = query(purchasesCol, orderBy('orderDate', 'desc'));
  const purchaseSnapshot = await getDocs(q);
  return purchaseSnapshot.docs.map(docSnap => fromFirestorePurchase(docSnap));
};

export const addPurchaseFS = async (data: PurchaseFormValues): Promise<string> => {
    let dataToSave = { ...data };
    const newDocRef = doc(collection(db, PURCHASES_COLLECTION));
    const purchaseId = newDocRef.id;

    if (data.invoiceDataUri) {
        const { downloadUrl, storagePath, contentType } = await uploadInvoice(data.invoiceDataUri, purchaseId);
        dataToSave.invoiceUrl = downloadUrl;
        dataToSave.storagePath = storagePath;
        dataToSave.invoiceContentType = contentType;
    }

    return await runTransaction(db, async (transaction) => {
        // --- Read Phase ---
        const supplierId = await findOrCreateSupplier(data, transaction);
        if (!supplierId) {
            throw new Error("Failed to process supplier. Supplier name might be empty.");
        }
        
        // --- Write Phase ---
        const firestoreData = toFirestorePurchase(dataToSave, true, supplierId);
        await updateStockForPurchase(transaction, null, firestoreData);
        
        transaction.set(newDocRef, firestoreData);
        return purchaseId;
    });
};

export const updatePurchaseFS = async (id: string, data: Partial<PurchaseFormValues>): Promise<void> => {
    let dataToSave = { ...data };
    const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);

    // Handle invoice upload outside the transaction
    if (data.invoiceDataUri) {
        if(data.storagePath) {
            console.warn(`An invoice already exists at ${data.storagePath}. It will be orphaned, not deleted.`);
        }
        const { downloadUrl, storagePath, contentType } = await uploadInvoice(data.invoiceDataUri, id);
        dataToSave.invoiceUrl = downloadUrl;
        dataToSave.storagePath = storagePath;
        dataToSave.invoiceContentType = contentType;
    }

    await runTransaction(db, async (transaction) => {
        // --- Read Phase ---
        const existingPurchaseDoc = await transaction.get(purchaseDocRef);
        if (!existingPurchaseDoc.exists()) {
            throw new Error("Purchase not found");
        }
        const oldData = fromFirestorePurchase(existingPurchaseDoc);
        let supplierId = await findOrCreateSupplier(data, transaction) || oldData.supplierId;
        
        // --- Write Phase ---
        const firestoreData = toFirestorePurchase(dataToSave as PurchaseFormValues, false, supplierId);
        await updateStockForPurchase(transaction, oldData, firestoreData);
        
        transaction.update(purchaseDocRef, firestoreData);
    });
};

export const deletePurchaseFS = async (id: string): Promise<void> => {
  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
  
  await runTransaction(db, async (transaction) => {
      // --- Read Phase ---
      const docSnap = await transaction.get(purchaseDocRef);
      if (!docSnap.exists()) {
          console.warn(`Purchase document with ID: ${id} not found for deletion.`);
          return;
      }
      const data = fromFirestorePurchase(docSnap);

      // --- Write Phase ---
      if (data.status === 'Factura Recibida') {
        await updateStockForPurchase(transaction, data, null);
      }
      
      // Note: File deletion from storage is not transactional and should be handled separately
      // if required, possibly via a Cloud Function triggered on document deletion.

      transaction.delete(purchaseDocRef);
  });
};
