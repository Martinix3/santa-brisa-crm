
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
    
    return await runTransaction(db, async (transaction) => {
        // --- STAGE 1: READS ---
        const supplierSnapshot = await getDocs(supplierQuery);
        const existingSupplierDoc = supplierSnapshot.empty ? null : supplierSnapshot.docs[0];
        
        const existingMaterialIds = dataToSave.items
            .map(item => item.materialId)
            .filter((id): id is string => !!id && id !== NEW_ITEM_SENTINEL);
            
        const materialDocsMap = new Map<string, DocumentSnapshot>();
        if (existingMaterialIds.length > 0) {
            const uniqueIds = [...new Set(existingMaterialIds)];
            const materialRefs = uniqueIds.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
            const materialSnaps = await Promise.all(materialRefs.map(ref => transaction.get(ref)));
            materialSnaps.forEach(snap => {
                if (snap.exists()) materialDocsMap.set(snap.id, snap);
            });
        }
        // ---- ALL READS ARE NOW COMPLETE ----

        // --- STAGE 2: LOGIC & PREPARING WRITES ---
        let supplierId: string;
        if (existingSupplierDoc) {
            supplierId = existingSupplierDoc.id;
        } else {
            const newSupplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
            supplierId = newSupplierRef.id;
            const newSupplierData = toFirestoreSupplier({ name: supplierName, cif: data.supplierCif }, true);
            transaction.set(newSupplierRef, newSupplierData);
        }
        
        const resolvedItems = dataToSave.items.map(item => {
            const isNew = !item.materialId || item.materialId === NEW_ITEM_SENTINEL;
            if (isNew) {
                const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
                return { ...item, materialId: newMaterialRef.id, isNew: true };
            }
            return { ...item, materialId: item.materialId!, isNew: false };
        });

        const firestoreData = toFirestorePurchase({ ...dataToSave, items: resolvedItems }, true, supplierId);

        if (firestoreData.status === 'Factura Recibida') {
            for (const item of resolvedItems) {
                if (!item.materialId) continue;
                
                const materialRef = doc(db, INVENTORY_ITEMS_COLLECTION, item.materialId);

                if (item.isNew) {
                    const newItemData = createNewMaterialData(item, data.supplier, data.orderDate, true);
                    transaction.set(materialRef, newItemData);
                    
                    const materialDataForBatch = { id: item.materialId, stock: 0, ...newItemData } as InventoryItem;
                    const batchId = await createItemBatchTransactional(transaction, materialDataForBatch, {
                         purchaseId, supplierBatchCode: item.batchNumber || undefined, quantity: item.quantity || 0, unitCost: item.unitPrice || 0
                    });
                     await addStockTxnFSTransactional(transaction, {
                        inventoryItemId: item.materialId, batchId, qtyDelta: item.quantity || 0, newStock: item.quantity || 0, unitCost: item.unitPrice,
                        refCollection: 'purchases', refId: purchaseId, txnType: 'recepcion', notes: `Recepción inicial de ${data.supplier}`
                    });
                } else {
                    const materialDoc = materialDocsMap.get(item.materialId);
                    if (materialDoc?.exists()) {
                        const materialData = { id: materialDoc.id, ...materialDoc.data() } as InventoryItem;
                        const delta = item.quantity || 0;
                        const newStock = (materialData.stock || 0) + delta;

                        const batchId = await createItemBatchTransactional(transaction, materialData, {
                            purchaseId, supplierBatchCode: item.batchNumber || undefined, quantity: delta, unitCost: item.unitPrice || 0
                        });
                        await addStockTxnFSTransactional(transaction, {
                            inventoryItemId: item.materialId, batchId, qtyDelta: delta, newStock, unitCost: item.unitPrice,
                            refCollection: 'purchases', refId: purchaseId, txnType: 'recepcion', notes: `Recepción desde compra a ${data.supplier}`
                        });
                        
                        transaction.update(materialRef, { stock: newStock });
                    }
                }
            }
            firestoreData.batchesSeeded = true;
        }
        
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
    
    await runTransaction(db, async (transaction) => {
        const existingPurchaseDoc = await transaction.get(purchaseDocRef);
        if (!existingPurchaseDoc.exists()) throw new Error("Purchase not found");
        const oldData = fromFirestorePurchase(existingPurchaseDoc);

        // Disallow editing items if stock has already been seeded.
        if (oldData.batchesSeeded && JSON.stringify(data.items) !== JSON.stringify(oldData.items)) {
            throw new Error("No se pueden modificar los artículos de una compra que ya ha sido recibida en el inventario. Por favor, crea una transacción de ajuste.");
        }
        
        const firestoreData = toFirestorePurchase({ ...oldData, ...dataToSave }, false, oldData.supplierId);
        
        const wasReceived = oldData.status === 'Factura Recibida';
        const isNowReceived = firestoreData.status === 'Factura Recibida';

        // Only run stock update logic if the state transitions TO received.
        if (isNowReceived && !wasReceived) {
             const allMaterialIds = firestoreData.items.map(i => i.materialId).filter((id): id is string => !!id);
             const materialDocsMap = new Map<string, DocumentSnapshot>();
             if(allMaterialIds.length > 0) {
                 const materialRefs = [...new Set(allMaterialIds)].map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
                 const materialSnaps = await Promise.all(materialRefs.map(ref => transaction.get(ref)));
                 materialSnaps.forEach(snap => {
                     if(snap.exists()) materialDocsMap.set(snap.id, snap);
                 });
             }
             
            for (const item of firestoreData.items) {
                if (!item.materialId) continue;
                
                const materialDoc = materialDocsMap.get(item.materialId);
                if (materialDoc?.exists()) {
                    const materialData = { id: materialDoc.id, ...materialDoc.data() } as InventoryItem;
                    const delta = item.quantity || 0;
                    const newStock = (materialData.stock || 0) + delta;

                    const batchId = await createItemBatchTransactional(transaction, materialData, {
                        purchaseId: id, supplierBatchCode: item.batchNumber || undefined, quantity: delta, unitCost: item.unitPrice || 0
                    });
                    await addStockTxnFSTransactional(transaction, {
                        inventoryItemId: item.materialId, batchId, qtyDelta: delta, newStock, unitCost: item.unitPrice,
                        refCollection: 'purchases', refId: id, txnType: 'recepcion', notes: `Recepción desde compra a ${firestoreData.supplier}`
                    });
                    
                    transaction.update(materialDoc.ref, { stock: newStock });
                }
            }
            firestoreData.batchesSeeded = true;
        }

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

      if (data.batchesSeeded) {
          throw new Error("No se puede eliminar una compra que ya ha sido recibida en el stock. Por favor, crea una transacción de ajuste para revertir el stock.");
      }

      transaction.delete(purchaseDocRef);
  });
};
