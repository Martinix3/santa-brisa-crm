
'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction,
  type DocumentSnapshot,
} from "firebase/firestore";
import type { InventoryItem, InventoryItemFormValues, LatestPurchaseInfo } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';

const fromFirestoreInventoryItem = (docSnap: DocumentSnapshot): InventoryItem => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  let latestPurchase: LatestPurchaseInfo | undefined = undefined;
  if (data.latestPurchase) {
    latestPurchase = {
      quantityPurchased: data.latestPurchase.quantityPurchased || 0,
      totalPurchaseCost: data.latestPurchase.totalPurchaseCost || 0,
      purchaseDate: data.latestPurchase.purchaseDate instanceof Timestamp ? format(data.latestPurchase.purchaseDate.toDate(), "yyyy-MM-dd") : (typeof data.latestPurchase.purchaseDate === 'string' ? data.latestPurchase.purchaseDate : format(new Date(), "yyyy-MM-dd")),
      calculatedUnitCost: data.latestPurchase.calculatedUnitCost || 0,
      notes: data.latestPurchase.notes || undefined,
    };
  }

  return {
    id: docSnap.id,
    name: data.name || '',
    description: data.description || undefined,
    categoryId: data.categoryId,
    latestPurchase: latestPurchase,
    stock: data.stock || 0,
    sku: data.sku || undefined,
  };
};

const toFirestoreInventoryItem = (data: InventoryItemFormValues, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    categoryId: data.categoryId,
    description: data.description || null,
    sku: data.sku || null,
  };
  
  if (isNew) {
    firestoreData.stock = 0;
  }

  if (data.latestPurchaseQuantity && data.latestPurchaseTotalCost && data.latestPurchaseDate) {
    const calculatedUnitCost = data.latestPurchaseTotalCost / data.latestPurchaseQuantity;
    firestoreData.latestPurchase = {
      quantityPurchased: data.latestPurchaseQuantity,
      totalPurchaseCost: data.latestPurchaseTotalCost,
      purchaseDate: data.latestPurchaseDate instanceof Date && isValid(data.latestPurchaseDate) ? Timestamp.fromDate(data.latestPurchaseDate) : Timestamp.fromDate(new Date()),
      calculatedUnitCost: parseFloat(calculatedUnitCost.toFixed(4)),
      notes: data.latestPurchaseNotes || null,
    };
    if (isNew) {
        firestoreData.stock = data.latestPurchaseQuantity;
    }
  } else if (isNew) {
    firestoreData.latestPurchase = null;
  }

  return firestoreData;
};

export const getInventoryItemsFS = async (): Promise<InventoryItem[]> => {
  const itemsCol = collection(db, INVENTORY_ITEMS_COLLECTION);
  const q = query(itemsCol, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => fromFirestoreInventoryItem(docSnap));
};

export const getInventoryItemByIdFS = async (id: string): Promise<InventoryItem | null> => {
  if (!id) return null;
  const itemDocRef = doc(db, INVENTORY_ITEMS_COLLECTION, id);
  const docSnap = await getDoc(itemDocRef);
  return docSnap.exists() ? fromFirestoreInventoryItem(docSnap) : null;
};

export const addInventoryItemFS = async (data: InventoryItemFormValues): Promise<string> => {
  const firestoreData = toFirestoreInventoryItem(data, true);
  const docRef = await addDoc(collection(db, INVENTORY_ITEMS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateInventoryItemFS = async (id: string, data: InventoryItemFormValues): Promise<void> => {
  const itemDocRef = doc(db, INVENTORY_ITEMS_COLLECTION, id);
  const firestoreData = toFirestoreInventoryItem(data, false);
  
  const existingDoc = await getDoc(itemDocRef);
  if (existingDoc.exists()) {
    const oldData = fromFirestoreInventoryItem(existingDoc);
    const oldPurchaseQty = oldData.latestPurchase?.quantityPurchased || 0;
    const newPurchaseQty = data.latestPurchaseQuantity || 0;
    firestoreData.stock = (oldData.stock - oldPurchaseQty) + newPurchaseQty;
  }
  
  await updateDoc(itemDocRef, firestoreData);
};

export const deleteInventoryItemFS = async (id: string): Promise<void> => {
  const itemDocRef = doc(db, INVENTORY_ITEMS_COLLECTION, id);
  await deleteDoc(itemDocRef);
};


export const updateInventoryItemStockFS = async (materialId: string, quantityChange: number): Promise<void> => {
  if (!materialId || typeof quantityChange !== 'number') {
    console.error("Invalid arguments for updateInventoryItemStockFS:", { materialId, quantityChange });
    return;
  }

  const materialDocRef = doc(db, INVENTORY_ITEMS_COLLECTION, materialId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const materialDoc = await transaction.get(materialDocRef);
      if (!materialDoc.exists()) {
        throw new Error(`Inventory Item with ID ${materialId} does not exist.`);
      }

      const currentStock = materialDoc.data().stock || 0;
      const newStock = currentStock + quantityChange;

      console.log(`Updating stock for item ${materialId}. Current: ${currentStock}, Change: ${quantityChange}, New: ${newStock}`);
      
      transaction.update(materialDocRef, { stock: newStock });
    });
  } catch (e) {
    console.error("Stock update transaction failed: ", e);
    throw e; // Re-throw the error to be handled by the caller
  }
};
