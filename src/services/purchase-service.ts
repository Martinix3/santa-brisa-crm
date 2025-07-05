
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

const handleStockUpdate = async (
    transaction: any, 
    purchaseId: string, 
    purchaseData: PurchaseFirestorePayload, 
    materialDocsMap: Map<string, DocumentSnapshot>
) => {
    for (const item of purchaseData.items) {
        if (!item.materialId) continue;
        
        const materialRef = doc(db, INVENTORY_ITEMS_COLLECTION, item.materialId);
        const materialDoc = materialDocsMap.get(item.materialId);

        if (!materialDoc || !materialDoc.exists()) {
            console.warn(`Material ${item.materialId} no encontrado en el mapa, podría ser nuevo. Saltando.`);
            continue;
        }

        const materialDataForBatch = { id: materialDoc.id, ...materialDoc.data() } as InventoryItem;
        const delta = item.quantity || 0;
        const newStock = (materialDataForBatch.stock || 0) + delta;

        const batchId = await createItemBatchTransactional(transaction, materialDataForBatch, {
            purchaseId, 
            supplierBatchCode: item.batchNumber || undefined, 
            quantity: delta, 
            unitCost: item.unitPrice || 0,
        });

        await addStockTxnFSTransactional(transaction, {
            inventoryItemId: item.materialId, 
            batchId: batchId, 
            qtyDelta: delta, 
            newStock: newStock, 
            unitCost: item.unitPrice,
            refCollection: 'purchases', 
            refId: purchaseId, 
            txnType: 'recepcion', 
            notes: `Recepción desde compra a ${purchaseData.supplier}`
        });
        
        transaction.update(materialRef, { stock: newStock });
    }
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
        const materialDocsMapForNewItems = new Map<string, DocumentSnapshot>();

        const resolvedItems = dataToSave.items.map((item, index) => {
            if (item.materialId && item.materialId !== NEW_ITEM_SENTINEL) {
                return { ...item, materialId: item.materialId! };
            }
            const category = categoriesMap.get(item.categoryId);
            const isStockable = category?.isConsumable === true;
            if (isStockable) {
                const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
                const newItemData = createNewMaterialData(item, data.supplier, data.orderDate, data.status === 'Factura Recibida');
                transaction.set(newMaterialRef, newItemData);
                // Simulate a snapshot for the stock update logic
                materialDocsMapForNewItems.set(newMaterialRef.id, { id: newMaterialRef.id, exists: () => true, data: () => newItemData } as DocumentSnapshot);
                return { ...item, materialId: newMaterialRef.id };
            }
            return { ...item, materialId: null };
        });

        const firestoreData = toFirestorePurchase({ ...dataToSave, items: resolvedItems }, true, supplierId);
        
        // --- WRITES ---
        transaction.set(newPurchaseDocRef, firestoreData);
        
        if (firestoreData.status === 'Factura Recibida') {
            await handleStockUpdate(transaction, purchaseId, firestoreData, materialDocsMapForNewItems);
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
    
    await runTransaction(db, async (transaction) => {
        // --- READS ---
        const existingPurchaseDoc = await transaction.get(purchaseDocRef);
        if (!existingPurchaseDoc.exists()) throw new Error("Purchase not found");
        const oldData = fromFirestorePurchase(existingPurchaseDoc);

        const supplierName = data.supplier?.trim() || oldData.supplier;
        const supplierQuery = query(collection(db, SUPPLIERS_COLLECTION), where("name", "==", supplierName), limit(1));
        const supplierSnapshot = await getDocs(supplierQuery);
        const existingSupplierDoc = supplierSnapshot.empty ? null : supplierSnapshot.docs[0];
        
        const allMaterialIds = [...new Set(
            (data.items || oldData.items).map(item => item.materialId).filter((id): id is string => !!id && id !== NEW_ITEM_SENTINEL)
        )];
        
        const materialDocsMap = new Map<string, DocumentSnapshot>();
        if (allMaterialIds.length > 0) {
            const materialRefs = allMaterialIds.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
            const snaps = await Promise.all(materialRefs.map(ref => transaction.get(ref)));
            snaps.forEach((snap, index) => {
                if (snap.exists()) materialDocsMap.set(allMaterialIds[index], snap);
            });
        }
        
        // --- LOGIC ---
        let supplierId = existingSupplierDoc?.id || oldData.supplierId;
        if (!supplierId) {
            const newSupplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
            supplierId = newSupplierRef.id;
            const newSupplierData = toFirestoreSupplier({ name: supplierName, cif: data.supplierCif }, true);
            transaction.set(newSupplierRef, newSupplierData);
        }

        const itemsFromForm = data.items || oldData.items;
        const firestoreData = toFirestorePurchase({ ...oldData, ...dataToSave, items: itemsFromForm }, false, supplierId);
        
        // --- WRITES ---
        transaction.update(purchaseDocRef, firestoreData);
        
        const oldStatusWasReceived = oldData.batchesSeeded;
        const newStatusIsReceived = firestoreData.status === 'Factura Recibida';

        if (newStatusIsReceived && !oldStatusWasReceived) {
            await handleStockUpdate(transaction, id, firestoreData, materialDocsMap);
            transaction.update(purchaseDocRef, { batchesSeeded: true });
        }
    });
};


export const deletePurchaseFS = async (id: string): Promise<void> => {
  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
  
  await runTransaction(db, async (transaction) => {
      // --- READS ---
      const docSnap = await transaction.get(purchaseDocRef);
      if (!docSnap.exists()) {
          console.warn(`Purchase document with ID: ${id} not found for deletion.`);
          return;
      }
      const data = fromFirestorePurchase(docSnap);

      if (data.batchesSeeded) {
          throw new Error("Cannot delete a purchase that has already been received into stock. Please reverse it instead.");
      }

      transaction.delete(purchaseDocRef);
  });
};
