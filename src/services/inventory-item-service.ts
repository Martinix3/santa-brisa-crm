
'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, type DocumentSnapshot, runTransaction
} from "firebase/firestore";
import type { InventoryItem, InventoryItemFormValues, LatestPurchaseInfo, UoM } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';

const fromFirestoreInventoryItem = (docSnap: DocumentSnapshot): InventoryItem => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined for InventoryItem.");

  let latestPurchase: LatestPurchaseInfo | undefined = undefined;
  if (data.latestPurchase) {
    latestPurchase = {
      quantityPurchased: data.latestPurchase.quantityPurchased || 0,
      totalPurchaseCost: data.latestPurchase.totalPurchaseCost || 0,
      purchaseDate: data.latestPurchase.purchaseDate,
      calculatedUnitCost: data.latestPurchase.calculatedUnitCost || 0,
      notes: data.latestPurchase.notes,
      batchNumber: data.latestPurchase.batchNumber || undefined,
    };
  }

  return {
    id: docSnap.id,
    name: data.name || '',
    description: data.description || '',
    categoryId: data.categoryId,
    latestPurchase: latestPurchase,
    stock: data.stock || 0,
    sku: data.sku || undefined,
    uom: data.uom || 'unit',
  };
};

const toFirestoreInventoryItem = (data: Partial<InventoryItemFormValues>): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    description: data.description || null,
    categoryId: data.categoryId,
    sku: data.sku || null,
    uom: data.uom || 'unit',
  };

  // Only create latestPurchase object if new data for it is provided
  if (data.latestPurchaseQuantity && data.latestPurchaseTotalCost && data.latestPurchaseDate) {
    firestoreData.latestPurchase = {
      quantityPurchased: data.latestPurchaseQuantity,
      totalPurchaseCost: data.latestPurchaseTotalCost,
      purchaseDate: format(data.latestPurchaseDate, "yyyy-MM-dd"),
      calculatedUnitCost: data.latestPurchaseTotalCost / data.latestPurchaseQuantity,
      notes: data.latestPurchaseNotes || null,
      batchNumber: data.latestPurchaseBatchNumber || null,
    };
  }

  // Timestamps and stock are handled by the calling functions (add/update)
  return firestoreData;
};

export const getInventoryItemsFS = async (): Promise<InventoryItem[]> => {
  const itemsCol = collection(db, INVENTORY_ITEMS_COLLECTION);
  const q = query(itemsCol, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => fromFirestoreInventoryItem(docSnap));
};

export const addInventoryItemFS = async (data: InventoryItemFormValues): Promise<string> => {
  const firestoreData = toFirestoreInventoryItem(data);

  // For a new item, stock is initialized from the first purchase quantity
  if (data.latestPurchaseQuantity) {
    firestoreData.stock = data.latestPurchaseQuantity;
  } else {
    firestoreData.stock = 0;
  }
  
  firestoreData.createdAt = Timestamp.fromDate(new Date());
  firestoreData.updatedAt = Timestamp.fromDate(new Date());

  const docRef = await addDoc(collection(db, INVENTORY_ITEMS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateInventoryItemFS = async (id: string, data: Partial<InventoryItemFormValues>): Promise<void> => {
  const itemDocRef = doc(db, INVENTORY_ITEMS_COLLECTION, id);

  await runTransaction(db, async (transaction) => {
    // 1. Read the existing document inside the transaction
    const itemDoc = await transaction.get(itemDocRef);
    if (!itemDoc.exists()) {
      throw new Error("Inventory item not found!");
    }

    const existingData = itemDoc.data();
    const existingStock = existingData.stock || 0;

    // 2. Prepare the new data object using the helper
    const firestoreUpdateData = toFirestoreInventoryItem(data);
    firestoreUpdateData.updatedAt = Timestamp.fromDate(new Date());

    // 3. Calculate new stock if a new purchase is being registered
    // This is the key fix: we add the new purchase quantity to the existing stock
    if (data.latestPurchaseQuantity && data.latestPurchaseTotalCost && data.latestPurchaseDate) {
      firestoreUpdateData.stock = existingStock + data.latestPurchaseQuantity;
    }

    // 4. Write the update back to Firestore
    transaction.update(itemDocRef, firestoreUpdateData);
  });
};

export const deleteInventoryItemFS = async (id: string): Promise<void> => {
  const itemDocRef = doc(db, INVENTORY_ITEMS_COLLECTION, id);
  await deleteDoc(itemDocRef);
};
