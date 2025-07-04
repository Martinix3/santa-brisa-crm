
'use server';

import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, type DocumentReference, getDoc, query, where, getDocs, type DocumentSnapshot, limit
} from "firebase/firestore";
import type { Purchase, PurchaseFormValues, PurchaseFirestorePayload, InventoryItem, Supplier } from '@/types';
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
    const newDocRef = doc(collection(db, PURCHASES_COLLECTION));
    const purchaseId = newDocRef.id;

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
        // --- STAGE 1: ALL READS ---
        let supplierId: string;
        let supplierRef: DocumentReference;
        let isNewSupplier = false;
        
        if (existingSupplierDoc) {
            supplierRef = doc(db, SUPPLIERS_COLLECTION, existingSupplierDoc.id);
            const supplierSnap = await transaction.get(supplierRef);
            if (!supplierSnap.exists()) {
                supplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
                isNewSupplier = true;
            }
            supplierId = supplierRef.id;
        } else {
            supplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
            isNewSupplier = true;
            supplierId = supplierRef.id;
        }

        const materialDocsMap = new Map<string, DocumentSnapshot>();
        const materialIdsToRead = dataToSave.items.map(item => item.materialId).filter((id): id is string => !!id && id !== NEW_ITEM_SENTINEL);
        if (materialIdsToRead.length > 0) {
            const uniqueIds = [...new Set(materialIdsToRead)];
            const materialRefs = uniqueIds.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
            const materialSnaps = await transaction.getAll(...materialRefs);
            materialSnaps.forEach(snap => {
                if (snap.exists()) {
                    materialDocsMap.set(snap.id, snap);
                }
            });
        }
        
        // ---- ALL READS ARE NOW COMPLETE ----

        // --- STAGE 2: ALL WRITES ---
        if (isNewSupplier) {
             const newSupplierData = toFirestoreSupplier({
                name: supplierName,
                cif: data.supplierCif,
                address_street: data.supplierAddress_street,
                address_number: data.supplierAddress_number,
                address_city: data.supplierAddress_city,
                address_province: data.supplierAddress_province,
                address_postalCode: data.supplierAddress_postalCode,
                address_country: data.supplierAddress_country
            }, true);
            transaction.set(supplierRef, newSupplierData);
        } else if (existingSupplierDoc) {
            const supplierData = existingSupplierDoc.data();
            if (!supplierData.cif && data.supplierCif) {
                transaction.update(supplierRef, { cif: data.supplierCif });
            }
        }
        
        const resolvedItems = await Promise.all(dataToSave.items.map(async (item) => {
            if (item.materialId && item.materialId !== NEW_ITEM_SENTINEL) return item;
            const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
            const newMaterialData = {
                name: item.description,
                description: `Creado desde compra a ${dataToSave.supplier}`,
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
        const firestoreData = toFirestorePurchase(finalData, true, supplierId);
        
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

    const supplierName = data.supplier?.trim();
    if (!supplierName) {
        throw new Error("Supplier name is required for update.");
    }
    const suppliersCol = collection(db, SUPPLIERS_COLLECTION);
    const supplierQuery = query(suppliersCol, where("name", "==", supplierName), limit(1));
    const supplierSnapshot = await getDocs(supplierQuery);
    const existingSupplierDoc = supplierSnapshot.empty ? null : supplierSnapshot.docs[0];

    await runTransaction(db, async (transaction) => {
        // --- STAGE 1: ALL READS ---
        const existingPurchaseDoc = await transaction.get(purchaseDocRef);
        if (!existingPurchaseDoc.exists()) throw new Error("Purchase not found");
        const oldData = fromFirestorePurchase(existingPurchaseDoc);

        let supplierId: string;
        let supplierRef: DocumentReference;
        let isNewSupplier = false;
        
        if (existingSupplierDoc) {
            supplierRef = doc(db, SUPPLIERS_COLLECTION, existingSupplierDoc.id);
             const supplierSnap = await transaction.get(supplierRef);
            if (!supplierSnap.exists()) {
                 supplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
                 isNewSupplier = true;
            }
            supplierId = supplierRef.id;
        } else {
            supplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
            isNewSupplier = true;
            supplierId = supplierRef.id;
        }

        const oldMaterialIds = oldData.items.map(item => item.materialId).filter((id): id is string => !!id);
        const newMaterialIds = (dataToSave.items || []).map(item => item.materialId).filter((id): id is string => !!id && id !== NEW_ITEM_SENTINEL);
        const materialIdsInvolved = [...new Set([...oldMaterialIds, ...newMaterialIds])];

        const materialDocsMap = new Map<string, DocumentSnapshot>();
        if (materialIdsInvolved.length > 0) {
            const materialRefs = materialIdsInvolved.map(id => doc(db, INVENTORY_ITEMS_COLLECTION, id));
            const materialSnaps = await transaction.getAll(...materialRefs);
            materialSnaps.forEach(snap => {
                if (snap.exists()) {
                    materialDocsMap.set(snap.id, snap);
                }
            });
        }
        // ---- ALL READS ARE NOW COMPLETE ----
        
        // --- STAGE 2: ALL WRITES ---
        if (isNewSupplier) {
             const newSupplierData = toFirestoreSupplier({
                name: supplierName,
                cif: data.supplierCif,
                address_street: data.supplierAddress_street,
            }, true);
            transaction.set(supplierRef, newSupplierData);
        }

        const resolvedItems = await Promise.all((dataToSave.items || []).map(async (item) => {
            if (item.materialId && item.materialId !== NEW_ITEM_SENTINEL) return item;
            const newMaterialRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
            const newMaterialData = {
                name: item.description,
                description: `Creado desde compra a ${dataToSave.supplier || oldData.supplier}`,
                categoryId: item.categoryId, stock: 0, uom: 'unit',
                createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
            };
            transaction.set(newMaterialRef, newMaterialData);
            return { ...item, materialId: newMaterialRef.id };
        }));

        const finalData = { ...dataToSave, items: resolvedItems };
        const firestoreData = toFirestorePurchase(finalData as PurchaseFormValues, false, supplierId);
        
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
        const materialSnaps = await transaction.getAll(...materialRefs);
        materialSnaps.forEach(snap => {
            if (snap.exists()) materialDocsMap.set(snap.id, snap);
        });
      }
      
      // --- STAGE 2: WRITES ---
      await updateStockForPurchase(transaction, data, null, materialDocsMap);
      transaction.delete(purchaseDocRef);
  });
};
