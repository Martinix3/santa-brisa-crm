
'use server';

import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, type DocumentReference, getDoc, query, where, getDocs, type DocumentSnapshot
} from "firebase/firestore";
import type { Purchase, PurchaseFormValues, PurchaseFirestorePayload, InventoryItem } from '@/types';
import { fromFirestorePurchase, toFirestorePurchase } from './utils/firestore-converters';
import { findOrCreateSupplier } from './supplier-service';
import { uploadInvoice } from './storage-service';
import { updateStockForPurchase } from './stock-service';

const PURCHASES_COLLECTION = 'purchases';
const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';

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
        // --- Gather all reads ---
        const supplierId = await findOrCreateSupplier(data, transaction);
        if (!supplierId) {
            throw new Error("Failed to process supplier. Supplier name might be empty.");
        }
        
        const materialIds = dataToSave.items?.map(item => item.materialId).filter(Boolean) || [];
        const materialRefs = materialIds.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
        const materialDocs = await Promise.all(materialRefs.map(ref => transaction.get(ref)));
        const materialDocsMap = new Map(materialDocs.map(d => [d.id, d]));

        // --- All writes happen after this point ---
        const firestoreData = toFirestorePurchase(dataToSave, true, supplierId);
        await updateStockForPurchase(transaction, null, firestoreData, materialDocsMap);
        
        transaction.set(newDocRef, firestoreData);
        return purchaseId;
    });
};

export const updatePurchaseFS = async (id: string, data: Partial<PurchaseFormValues>): Promise<void> => {
    let dataToSave = { ...data };
    const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);

    if (data.invoiceDataUri && !data.storagePath) {
        const { downloadUrl, storagePath, contentType } = await uploadInvoice(data.invoiceDataUri, id);
        dataToSave.invoiceUrl = downloadUrl;
        dataToSave.storagePath = storagePath;
        dataToSave.invoiceContentType = contentType;
    }

    await runTransaction(db, async (transaction) => {
        // --- All reads happen first ---
        const existingPurchaseDoc = await transaction.get(purchaseDocRef);
        if (!existingPurchaseDoc.exists()) {
            throw new Error("Purchase not found");
        }
        const oldData = fromFirestorePurchase(existingPurchaseDoc);
        
        const supplierId = await findOrCreateSupplier(data, transaction) || oldData.supplierId;
        
        const allMaterialIds = new Set<string>();
        (oldData.items || []).forEach(item => item.materialId && allMaterialIds.add(item.materialId));
        (dataToSave.items || []).forEach(item => item.materialId && allMaterialIds.add(item.materialId));
        
        const materialRefs = Array.from(allMaterialIds).map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
        const materialDocs = await Promise.all(materialRefs.map(ref => transaction.get(ref)));
        const materialDocsMap = new Map(materialDocs.map(d => [d.id, d]));

        // --- All writes happen after this point ---
        const firestoreData = toFirestorePurchase(dataToSave as PurchaseFormValues, false, supplierId);
        await updateStockForPurchase(transaction, oldData, firestoreData, materialDocsMap);
        
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

      const materialIds = data.items?.map(item => item.materialId).filter(Boolean) || [];
      const materialRefs = materialIds.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
      const materialDocs = await Promise.all(materialRefs.map(ref => transaction.get(ref)));
      const materialDocsMap = new Map(materialDocs.map(d => [d.id, d]));

      // --- Write Phase ---
      await updateStockForPurchase(transaction, data, null, materialDocsMap);
      
      transaction.delete(purchaseDocRef);
  });
};
