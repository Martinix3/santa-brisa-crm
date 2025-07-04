
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
        const supplierId = await findOrCreateSupplier(data, transaction);
        if (!supplierId) {
            throw new Error("Failed to process supplier. Supplier name might be empty.");
        }
        
        const resolvedItems = await Promise.all(dataToSave.items.map(async (item) => {
            if (item.materialId) {
                return item;
            }
            if (!item.description) {
                throw new Error("Cannot create a new inventory item without a description.");
            }
            const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
            const newMaterialData = {
                name: item.description,
                description: `Creado desde compra a ${dataToSave.supplier}`,
                categoryId: item.categoryId,
                stock: 0,
                uom: 'unit',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                latestPurchase: null,
                sku: null,
            };
            transaction.set(newMaterialRef, newMaterialData);
            return { ...item, materialId: newMaterialRef.id };
        }));

        const finalData = { ...dataToSave, items: resolvedItems };
        const firestoreData = toFirestorePurchase(finalData, true, supplierId);
        
        // --- All writes happen after this point ---
        const materialIds = finalData.items.map(item => item.materialId).filter((id): id is string => !!id);
        const materialDocsMap = new Map<string, DocumentSnapshot>();
        if(materialIds.length > 0) {
          const materialDocs = await Promise.all(materialIds.map(id => transaction.get(doc(db, INVENTORY_ITEMS_COLLECTION, id))));
          materialDocs.forEach(doc => materialDocsMap.set(doc.id, doc));
        }
        
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
        const existingPurchaseDoc = await transaction.get(purchaseDocRef);
        if (!existingPurchaseDoc.exists()) {
            throw new Error("Purchase not found");
        }
        const oldData = fromFirestorePurchase(existingPurchaseDoc);
        
        const supplierId = await findOrCreateSupplier(data, transaction) || oldData.supplierId;
        
         const resolvedItems = await Promise.all((dataToSave.items || []).map(async (item) => {
            if (item.materialId) {
                return item;
            }
            const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
            const newMaterialData = {
                name: item.description,
                description: `Creado desde compra a ${dataToSave.supplier || oldData.supplier}`,
                categoryId: item.categoryId,
                stock: 0,
                uom: 'unit',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            transaction.set(newMaterialRef, newMaterialData);
            return { ...item, materialId: newMaterialRef.id };
        }));

        const finalData = { ...dataToSave, items: resolvedItems };
        const firestoreData = toFirestorePurchase(finalData as PurchaseFormValues, false, supplierId);

        // --- All writes happen after this point ---
        const materialIdsInvolved = [...new Set([...(oldData.items.map(i => i.materialId)), ...(finalData.items.map(i => i.materialId!))])];
        const materialDocsMap = new Map<string, DocumentSnapshot>();
         if(materialIdsInvolved.length > 0) {
          const materialDocs = await Promise.all(materialIdsInvolved.map(id => transaction.get(doc(db, INVENTORY_ITEMS_COLLECTION, id))));
          materialDocs.forEach(doc => materialDocsMap.set(doc.id, doc));
        }

        await updateStockForPurchase(transaction, oldData, firestoreData, materialDocsMap);
        
        transaction.update(purchaseDocRef, firestoreData);
    });
};

export const deletePurchaseFS = async (id: string): Promise<void> => {
  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
  
  await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(purchaseDocRef);
      if (!docSnap.exists()) {
          console.warn(`Purchase document with ID: ${id} not found for deletion.`);
          return;
      }
      const data = fromFirestorePurchase(docSnap);

      // --- All writes happen after this point ---
      const materialIds = data.items.map(item => item.materialId).filter((id): id is string => !!id);
      const materialDocsMap = new Map<string, DocumentSnapshot>();
       if(materialIds.length > 0) {
          const materialDocs = await Promise.all(materialIds.map(id => transaction.get(doc(db, INVENTORY_ITEMS_COLLECTION, id))));
          materialDocs.forEach(doc => materialDocsMap.set(doc.id, doc));
       }
      
      await updateStockForPurchase(transaction, data, null, materialDocsMap);
      
      transaction.delete(purchaseDocRef);
  });
};
