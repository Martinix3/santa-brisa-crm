
'use server';

import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, type DocumentReference, getDoc, query, where, getDocs, type DocumentSnapshot, limit
} from "firebase/firestore";
import type { Purchase, PurchaseFormValues, PurchaseFirestorePayload, InventoryItem } from '@/types';
import { fromFirestorePurchase, toFirestorePurchase, toFirestoreSupplier } from './utils/firestore-converters';
import { uploadInvoice } from './storage-service';
import { updateStockForPurchase } from './stock-service';
import { format, parseISO } from 'date-fns';

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
    purchaseDate: Date
) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    return {
        name: item.description,
        description: `Creado desde compra a ${supplierName}`,
        categoryId: item.categoryId,
        stock: quantity, // Set initial stock from purchase
        uom: 'unit',
        latestPurchase: { // Set initial purchase info
            quantityPurchased: quantity,
            totalPurchaseCost: quantity * unitPrice,
            purchaseDate: format(purchaseDate, "yyyy-MM-dd"),
            calculatedUnitCost: unitPrice,
            notes: `Creación automática desde compra.`,
            batchNumber: item.batchNumber || null,
        },
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
    if (!supplierName) {
        throw new Error("Supplier name is required.");
    }
    const suppliersCol = collection(db, SUPPLIERS_COLLECTION);
    const supplierQuery = query(suppliersCol, where("name", "==", supplierName), limit(1));
    const supplierSnapshot = await getDocs(supplierQuery);
    const existingSupplierDoc = supplierSnapshot.empty ? null : supplierSnapshot.docs[0];

    return await runTransaction(db, async (transaction) => {
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

        newItemsToWrite.forEach((ref, index) => {
            const item = resolvedItems[index];
            const newMaterialData = createNewMaterialData(item, dataToSave.supplier!, dataToSave.orderDate!);
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
    const existingSupplierDoc = supplierSnapshot.empty ? null : supplierSnapshot.docs[0];

    await runTransaction(db, async (transaction) => {
        const existingPurchaseDoc = await transaction.get(purchaseDocRef);
        if (!existingPurchaseDoc.exists()) throw new Error("Purchase not found");
        const oldData = fromFirestorePurchase(existingPurchaseDoc);

        let supplierId: string;
        if (existingSupplierDoc) {
            supplierId = existingSupplierDoc.id;
        } else {
            const newSupplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
            supplierId = newSupplierRef.id;
            const newSupplierData = toFirestoreSupplier({ name: supplierName, cif: data.supplierCif }, true);
            transaction.set(newSupplierRef, newSupplierData);
        }

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
        
        const newItemsToWrite = new Map<number, DocumentReference>();
        const resolvedItems = (dataToSave.items || []).map((item, index) => {
            if (item.materialId && item.materialId !== NEW_ITEM_SENTINEL) return { ...item, materialId: item.materialId! };
            const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
            newItemsToWrite.set(index, newMaterialRef);
            return { ...item, materialId: newMaterialRef.id };
        });

        newItemsToWrite.forEach((ref, index) => {
            const item = resolvedItems[index];
            const purchaseDate = dataToSave.orderDate ? dataToSave.orderDate : parseISO(oldData.orderDate);
            const newMaterialData = createNewMaterialData(item, dataToSave.supplier || oldData.supplier, purchaseDate);
            transaction.set(ref, newMaterialData);
        });

        const finalData = { ...dataToSave, items: resolvedItems };
        const firestoreData = toFirestorePurchase(finalData as PurchaseFormValues, false, supplierId);
        
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
      
      await updateStockForPurchase(transaction, data, null, materialDocsMap);
      transaction.delete(purchaseDocRef);
  });
};
