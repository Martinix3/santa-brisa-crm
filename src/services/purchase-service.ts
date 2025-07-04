
'use server';

import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, type DocumentReference, getDoc, query, where, getDocs, type DocumentSnapshot, limit
} from "firebase/firestore";
import type { Purchase, PurchaseFormValues, PurchaseFirestorePayload, InventoryItem } from '@/types';
import { fromFirestorePurchase, toFirestorePurchase } from './utils/firestore-converters';
import { uploadInvoice } from './storage-service';
import { updateStockForPurchase } from './stock-service';
import { toFirestoreSupplier } from './supplier-service';

const PURCHASES_COLLECTION = 'purchases';
const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';
const SUPPLIERS_COLLECTION = 'suppliers';
const NEW_ITEM_SENTINEL = '##NEW##';

export const getPurchasesFS = async (): Promise<Purchase[]> => {
  const purchasesCol = collection(db, PURCHASES_COLLECTION);
  const q = query(purchasesCol, orderBy('orderDate', 'desc'));
  const purchaseSnapshot = await getDocs(q);
  return purchaseSnapshot.docs.map(docSnap => fromFirestorePurchase(docSnap));
};

export const addPurchaseFS = async (data: PurchaseFormValues): Promise<string> => {
    let dataToSave = { ...data };
    const newPurchaseDocRef = doc(collection(db, PURCHASES_COLLECTION));
    const purchaseId = newPurchaseDocRef.id;

    if (data.invoiceDataUri) {
        const { downloadUrl, storagePath, contentType } = await uploadInvoice(data.invoiceDataUri, purchaseId);
        dataToSave.invoiceUrl = downloadUrl;
        dataToSave.storagePath = storagePath;
        dataToSave.invoiceContentType = contentType;
    }

    const supplierName = data.supplier?.trim();
    if (!supplierName) {
        throw new Error("Supplier name is required.");
    }
    const suppliersCol = collection(db, SUPPLIERS_COLLECTION);
    const supplierQuery = query(suppliersCol, where("name", "==", supplierName), limit(1));
    const supplierSnapshot = await getDocs(supplierQuery);
    const existingSupplierDocData = supplierSnapshot.empty ? null : { id: supplierSnapshot.docs[0].id, ref: supplierSnapshot.docs[0].ref };

    return await runTransaction(db, async (transaction) => {
        // --- STAGE 1: ALL READS ---
        const materialDocsMap = new Map<string, DocumentSnapshot>();
        const materialIdsToRead = dataToSave.items.map(item => item.materialId).filter((id): id is string => !!id && id !== NEW_ITEM_SENTINEL);
        if (materialIdsToRead.length > 0) {
            const uniqueIds = [...new Set(materialIdsToRead)];
            const materialRefs = uniqueIds.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
            for (const ref of materialRefs) {
                const snap = await transaction.get(ref);
                if (snap.exists()) {
                    materialDocsMap.set(snap.id, snap);
                }
            }
        }
        
        // ---- ALL READS ARE NOW COMPLETE ----

        // --- STAGE 2: LOGIC & PREPARING WRITES ---
        let supplierId: string;
        let supplierRef: DocumentReference;
        const isNewSupplier = !existingSupplierDocData;
        
        if (existingSupplierDocData) {
            supplierId = existingSupplierDocData.id;
            supplierRef = existingSupplierDocData.ref;
        } else {
            supplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
            supplierId = supplierRef.id;
        }
        
        const newItemsToWrite = new Map<number, DocumentReference>();
        const resolvedItems = dataToSave.items.map((item, index) => {
            if (item.materialId && item.materialId !== NEW_ITEM_SENTINEL) {
                return { ...item, materialId: item.materialId! };
            }
            const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
            newItemsToWrite.set(index, newMaterialRef);
            return { ...item, materialId: newMaterialRef.id };
        });

        const finalData = { ...dataToSave, items: resolvedItems };
        const firestoreData = toFirestorePurchase(finalData, true, supplierId);

        // --- STAGE 3: ALL WRITES ---
        if (isNewSupplier) {
             const newSupplierData = toFirestoreSupplier({
                name: supplierName,
                cif: data.supplierCif,
                address_street: data.supplierAddress_street,
            }, true);
            transaction.set(supplierRef, newSupplierData);
        }
        
        newItemsToWrite.forEach((ref, index) => {
            const item = resolvedItems[index];
            const newMaterialData = {
                name: item.description,
                description: `Creado desde compra a ${dataToSave.supplier}`,
                categoryId: item.categoryId, stock: 0, uom: 'unit',
                createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
            };
            transaction.set(ref, newMaterialData);
        });
        
        await updateStockForPurchase(transaction, null, firestoreData, materialDocsMap);
        transaction.set(newPurchaseDocRef, firestoreData);
        
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

    const supplierName = data.supplier?.trim();
    if (!supplierName) {
        throw new Error("Supplier name is required for update.");
    }
    const suppliersCol = collection(db, SUPPLIERS_COLLECTION);
    const supplierQuery = query(suppliersCol, where("name", "==", supplierName), limit(1));
    const supplierSnapshot = await getDocs(supplierQuery);
    const existingSupplierDocData = supplierSnapshot.empty ? null : { id: supplierSnapshot.docs[0].id, ref: supplierSnapshot.docs[0].ref };

    await runTransaction(db, async (transaction) => {
        // --- STAGE 1: ALL READS ---
        const existingPurchaseDoc = await transaction.get(purchaseDocRef);
        if (!existingPurchaseDoc.exists()) throw new Error("Purchase not found");
        const oldData = fromFirestorePurchase(existingPurchaseDoc);

        const oldMaterialIds = oldData.items.map(item => item.materialId).filter((id): id is string => !!id);
        const newMaterialIds = (dataToSave.items || []).map(item => item.materialId).filter((id): id is string => !!id && id !== NEW_ITEM_SENTINEL);
        const materialIdsInvolved = [...new Set([...oldMaterialIds, ...newMaterialIds])];

        const materialDocsMap = new Map<string, DocumentSnapshot>();
        if (materialIdsInvolved.length > 0) {
            const materialRefs = materialIdsInvolved.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
            for (const ref of materialRefs) {
                const snap = await transaction.get(ref);
                if (snap.exists()) {
                    materialDocsMap.set(snap.id, snap);
                }
            }
        }
        
        // --- STAGE 2: LOGIC & PREPARING WRITES ---
        let supplierId: string;
        let supplierRef: DocumentReference;
        const isNewSupplier = !existingSupplierDocData;
        
        if (existingSupplierDocData) {
            supplierId = existingSupplierDocData.id;
            supplierRef = existingSupplierDocData.ref;
        } else {
            supplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
            supplierId = supplierRef.id;
        }
        
        const newItemsToWrite = new Map<number, DocumentReference>();
        const resolvedItems = (dataToSave.items || []).map((item, index) => {
            if (item.materialId && item.materialId !== NEW_ITEM_SENTINEL) return { ...item, materialId: item.materialId! };
            const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
            newItemsToWrite.set(index, newMaterialRef);
            return { ...item, materialId: newMaterialRef.id };
        });

        const finalData = { ...dataToSave, items: resolvedItems };
        const firestoreData = toFirestorePurchase(finalData as PurchaseFormValues, false, supplierId);
        
        // --- STAGE 3: ALL WRITES ---
        if (isNewSupplier) {
            const newSupplierData = toFirestoreSupplier({ name: supplierName, cif: data.supplierCif }, true);
            transaction.set(supplierRef, newSupplierData);
        }

        newItemsToWrite.forEach((ref, index) => {
            const item = resolvedItems[index];
            const newMaterialData = {
                name: item.description,
                description: `Creado desde compra a ${dataToSave.supplier || oldData.supplier}`,
                categoryId: item.categoryId, stock: 0, uom: 'unit',
                createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
            };
            transaction.set(ref, newMaterialData);
        });

        await updateStockForPurchase(transaction, oldData, firestoreData, materialDocsMap);
        transaction.update(purchaseDocRef, firestoreData);
    });
};

export const deletePurchaseFS = async (id: string): Promise<void> => {
  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
  
  await runTransaction(db, async (transaction) => {
      // --- STAGE 1: READS ---
      const docSnap = await transaction.get(purchaseDocRef);
      if (!docSnap.exists()) {
          console.warn(`Purchase document with ID: ${id} not found for deletion.`);
          return;
      }
      const data = fromFirestorePurchase(docSnap);

      const materialIds = data.items.map(item => item.materialId).filter((id): id is string => !!id);
      const materialDocsMap = new Map<string, DocumentSnapshot>();
      if(materialIds.length > 0) {
        const materialRefs = materialIds.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
        for (const ref of materialRefs) {
            const snap = await transaction.get(ref);
            if (snap.exists()) {
                materialDocsMap.set(snap.id, snap);
            }
        }
      }
      
      // --- STAGE 2: WRITES ---
      await updateStockForPurchase(transaction, data, null, materialDocsMap);
      transaction.delete(purchaseDocRef);
  });
};
