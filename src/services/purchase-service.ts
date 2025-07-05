
'use server';

import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, type DocumentReference, getDoc, query, where, getDocs, type DocumentSnapshot, limit
} from "firebase/firestore";
import type { Purchase, PurchaseFormValues, PurchaseFirestorePayload, InventoryItem, Supplier } from '@/types';
import { fromFirestorePurchase, toFirestorePurchase, toFirestoreSupplier } from './utils/firestore-converters';
import { uploadInvoice } from './storage-service';
import { getCategoriesFS } from './category-service';
import { createItemBatchTransactional } from './batch-service'; 
import { addStockTxnFSTransactional } from './stock-txn-service';
import { format } from 'date-fns';

const PURCHASES_COLLECTION = 'purchases';
const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';
const SUPPLIERS_COLLECTION = 'suppliers';
const NEW_ITEM_SENTINEL = '##NEW##';

/**
 * Creates the data object for a new inventory item based on a purchase line item.
 */
const createNewMaterialData = (
    item: PurchaseFormValues['items'][0],
    supplierName: string,
    purchaseDate: Date,
    isReceived: boolean,
) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    return {
        name: item.description,
        description: `Creado desde compra a ${supplierName}`,
        categoryId: item.categoryId,
        stock: isReceived ? quantity : 0,
        uom: 'unit',
        latestPurchase: isReceived ? {
            quantityPurchased: quantity,
            totalPurchaseCost: quantity * unitPrice,
            purchaseDate: format(purchaseDate, "yyyy-MM-dd"),
            calculatedUnitCost: unitPrice,
            notes: `Creación automática desde compra.`,
            batchNumber: item.batchNumber || null,
        } : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
};

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
    if (!supplierName) throw new Error("Supplier name is required.");
    
    const suppliersCol = collection(db, SUPPLIERS_COLLECTION);
    const supplierQuery = query(suppliersCol, where("name", "==", supplierName), limit(1));
    const allCategories = await getCategoriesFS(); // Read outside transaction
    
    return await runTransaction(db, async (transaction) => {
        // --- READS ---
        const supplierSnapshot = await getDocs(supplierQuery);
        const existingSupplierDoc = supplierSnapshot.empty ? null : supplierSnapshot.docs[0];
        
        const materialDocsMap = new Map<string, DocumentSnapshot>();
        const materialIdsToRead = dataToSave.items.map(item => item.materialId).filter((id): id is string => !!id && id !== NEW_ITEM_SENTINEL);
        if (materialIdsToRead.length > 0) {
            const uniqueIds = [...new Set(materialIdsToRead)];
            const materialRefs = uniqueIds.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
            const snaps = await Promise.all(materialRefs.map(ref => transaction.get(ref)));
            snaps.forEach((snap, index) => {
                if(snap.exists()){
                    materialDocsMap.set(uniqueIds[index], snap);
                }
            });
        }
        
        // --- LOGIC & PREPARING WRITES ---
        let supplierId: string;
        if (existingSupplierDoc) {
            supplierId = existingSupplierDoc.id;
        } else {
            const newSupplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
            supplierId = newSupplierRef.id;
            const newSupplierData = toFirestoreSupplier({ name: supplierName, cif: data.supplierCif }, true);
            transaction.set(newSupplierRef, newSupplierData);
        }

        const categoriesMap = new Map(allCategories.map(c => [c.id, c]));
        const newItemsToWrite = new Map<number, DocumentReference>();
        const resolvedItems = dataToSave.items.map((item, index) => {
            if (item.materialId && item.materialId !== NEW_ITEM_SENTINEL) {
                return { ...item, materialId: item.materialId! };
            }
            const category = categoriesMap.get(item.categoryId);
            const isStockable = category?.isConsumable === true;
            if (isStockable) {
                const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
                newItemsToWrite.set(index, newMaterialRef);
                return { ...item, materialId: newMaterialRef.id };
            }
            return { ...item, materialId: null };
        });

        const firestoreData = toFirestorePurchase({ ...dataToSave, items: resolvedItems }, true, supplierId);
        
        // --- WRITES ---
        transaction.set(newPurchaseDocRef, firestoreData);
        
        const isReceived = firestoreData.status === 'Factura Recibida';
        if (isReceived) {
            // Handle stock update for all items (new and existing)
            for (const [index, item] of firestoreData.items.entries()) {
                if (!item.materialId) continue; // Skip non-stockable items
                
                const materialRef = doc(db, INVENTORY_ITEMS_COLLECTION, item.materialId);
                const delta = item.quantity || 0;
                let newStock: number;
                let materialDataForBatch: InventoryItem;

                if (newItemsToWrite.has(index)) { // It's a brand new item
                    const newItemData = createNewMaterialData(resolvedItems[index], data.supplier, data.orderDate, true);
                    transaction.set(materialRef, newItemData);
                    newStock = delta;
                    materialDataForBatch = { id: materialRef.id, ...newItemData } as InventoryItem;
                } else { // It's an existing item
                    const materialDoc = materialDocsMap.get(item.materialId);
                    if (materialDoc && materialDoc.exists()) {
                        const existingData = materialDoc.data() as InventoryItem;
                        newStock = (existingData.stock || 0) + delta;
                        materialDataForBatch = { id: materialDoc.id, ...existingData };
                        transaction.update(materialRef, { stock: newStock });
                    } else {
                        console.warn(`Material ${item.materialId} not found, skipping stock update.`);
                        continue;
                    }
                }

                // Create batch and stock transaction for both new and existing items
                const batchId = await createItemBatchTransactional(transaction, materialDataForBatch, {
                    purchaseId, supplierBatchCode: item.batchNumber || undefined, quantity: delta, unitCost: item.unitPrice || 0,
                });

                await addStockTxnFSTransactional(transaction, {
                    inventoryItemId: item.materialId, batchId: batchId, qtyDelta: delta, newStock, unitCost: item.unitPrice,
                    refCollection: 'purchases', refId: purchaseId, txnType: 'recepcion', notes: `Recepción desde compra a ${firestoreData.supplier}`
                });
            }
        }
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
    if (!supplierName) throw new Error("Supplier name is required for update.");
    
    const suppliersCol = collection(db, SUPPLIERS_COLLECTION);
    const supplierQuery = query(suppliersCol, where("name", "==", supplierName), limit(1));
    const allCategories = await getCategoriesFS(); // Read outside transaction
    const categoriesMap = new Map(allCategories.map(c => [c.id, c]));

    await runTransaction(db, async (transaction) => {
        // --- READS ---
        const existingPurchaseDoc = await transaction.get(purchaseDocRef);
        if (!existingPurchaseDoc.exists()) throw new Error("Purchase not found");
        const oldData = fromFirestorePurchase(existingPurchaseDoc);

        const supplierSnapshot = await getDocs(supplierQuery);
        const existingSupplierDoc = supplierSnapshot.empty ? null : supplierSnapshot.docs[0];

        const allMaterialIds = [
            ...oldData.items.map(item => item.materialId).filter((id): id is string => !!id),
            ...(dataToSave.items || []).map(item => item.materialId).filter((id): id is string => !!id && id !== NEW_ITEM_SENTINEL)
        ];
        const materialIdsInvolved = [...new Set(allMaterialIds)];
        const materialDocsMap = new Map<string, DocumentSnapshot>();
        if (materialIdsInvolved.length > 0) {
            const materialRefs = materialIdsInvolved.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
            const snaps = await Promise.all(materialRefs.map(ref => transaction.get(ref)));
            snaps.forEach((snap, index) => {
                if (snap.exists()) {
                    materialDocsMap.set(materialIdsInvolved[index], snap);
                }
            });
        }
        
        // --- LOGIC ---
        let supplierId: string;
        if (existingSupplierDoc) {
            supplierId = existingSupplierDoc.id;
        } else {
            const newSupplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
            supplierId = newSupplierRef.id;
            const newSupplierData = toFirestoreSupplier({ name: supplierName, cif: data.supplierCif }, true);
            transaction.set(newSupplierRef, newSupplierData);
        }

        const newItemsToWrite = new Map<number, DocumentReference>();
        const resolvedItems = (dataToSave.items || []).map((item, index) => {
            if (item.materialId && item.materialId !== NEW_ITEM_SENTINEL) return { ...item, materialId: item.materialId! };
            const category = categoriesMap.get(item.categoryId);
            const isStockable = category?.isConsumable === true;
            if (isStockable) {
                const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
                newItemsToWrite.set(index, newMaterialRef);
                return { ...item, materialId: newMaterialRef.id };
            }
            return { ...item, materialId: null };
        });
        
        const finalData = { ...dataToSave, items: resolvedItems };
        const firestoreData = toFirestorePurchase(finalData as PurchaseFormValues, false, supplierId);
        
        // --- WRITES ---
        transaction.update(purchaseDocRef, firestoreData);

        newItemsToWrite.forEach((ref, index) => {
            const item = resolvedItems[index];
            const purchaseDate = dataToSave.orderDate || new Date();
            const newMaterialData = createNewMaterialData(item, dataToSave.supplier || oldData.supplier, purchaseDate, firestoreData.status === 'Factura Recibida');
            transaction.set(ref, newMaterialData);
        });

        const oldStatusWasReceived = oldData.status === 'Factura Recibida';
        const newStatusIsReceived = firestoreData.status === 'Factura Recibida';

        if (oldStatusWasReceived && !newStatusIsReceived) {
            // Reversal logic
            for (const item of oldData.items || []) {
                if (item.materialId) {
                    const materialDoc = materialDocsMap.get(item.materialId);
                    if (materialDoc && materialDoc.exists()) {
                        const delta = -item.quantity!;
                        const newStock = (materialDoc.data()!.stock || 0) + delta;
                        transaction.update(materialDoc.ref, { stock: newStock });
                        // Reversal doesn't create a new stock transaction or batch, it assumes the original was a mistake.
                    }
                }
            }
        } else if (newStatusIsReceived && !oldStatusWasReceived) {
            // New reception logic
            for (const item of firestoreData.items) {
                 if (!item.materialId) continue;
                 const materialRef = doc(db, INVENTORY_ITEMS_COLLECTION, item.materialId);
                 const materialDoc = materialDocsMap.get(item.materialId);

                 const materialDataForBatch: InventoryItem = materialDoc && materialDoc.exists()
                    ? { id: materialDoc.id, ...materialDoc.data() as Omit<InventoryItem, 'id'> }
                    : { id: item.materialId, name: item.description, stock: 0, categoryId: item.categoryId, uom: 'unit' };

                 const delta = item.quantity || 0;
                 const newStock = (materialDataForBatch.stock || 0) + delta;

                 const batchId = await createItemBatchTransactional(transaction, materialDataForBatch, {
                     purchaseId: id, supplierBatchCode: item.batchNumber || undefined, quantity: delta, unitCost: item.unitPrice || 0,
                 });
                 await addStockTxnFSTransactional(transaction, {
                     inventoryItemId: item.materialId, batchId: batchId, qtyDelta: delta, newStock: newStock, unitCost: item.unitPrice,
                     refCollection: 'purchases', refId: id, txnType: 'recepcion', notes: `Recepción desde compra a ${firestoreData.supplier}`
                 });
                 
                 transaction.update(materialRef, { stock: newStock });
            }
        }
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

      if (data.status === 'Factura Recibida') {
        const materialIds = data.items.map(item => item.materialId).filter((id): id is string => !!id);
        const materialDocsMap = new Map<string, DocumentSnapshot>();
        if(materialIds.length > 0) {
            const materialRefs = materialIds.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
            const snaps = await Promise.all(materialRefs.map(ref => transaction.get(ref)));
            snaps.forEach((snap, index) => {
                if(snap.exists()){
                    materialDocsMap.set(materialIds[index], snap);
                }
            });
        }
        
        // Reversal logic
        for (const item of data.items) {
            if (item.materialId) {
                const materialDoc = materialDocsMap.get(item.materialId);
                if (materialDoc && materialDoc.exists()) {
                    const delta = -item.quantity!;
                    const newStock = (materialDoc.data()!.stock || 0) + delta;
                    transaction.update(materialDoc.ref, { stock: newStock });
                }
            }
        }
      }
      transaction.delete(purchaseDocRef);
  });
};
