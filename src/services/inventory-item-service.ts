
'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, type DocumentSnapshot
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

const toFirestoreInventoryItem = (data: Partial<InventoryItemFormValues>, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    description: data.description || null,
    categoryId: data.categoryId,
    sku: data.sku || null,
    uom: data.uom || 'unit',
  };

  // Only update latestPurchase if new data for it is provided
  if (data.latestPurchaseQuantity && data.latestPurchaseTotalCost && data.latestPurchaseDate) {
    firestoreData.latestPurchase = {
      quantityPurchased: data.latestPurchaseQuantity,
      totalPurchaseCost: data.latestPurchaseTotalCost,
      purchaseDate: format(data.latestPurchaseDate, "yyyy-MM-dd"),
      calculatedUnitCost: data.latestPurchaseTotalCost / data.latestPurchaseQuantity,
      notes: data.latestPurchaseNotes || null,
    };
    if(isNew) {
      firestoreData.stock = data.latestPurchaseQuantity;
    }
  }

  if (isNew) {
    if (firestoreData.stock === undefined) {
      firestoreData.stock = 0; // Initialize stock if no purchase data
    }
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());

  return firestoreData;
};

export const getInventoryItemsFS = async (): Promise<InventoryItem[]> => {
  const itemsCol = collection(db, INVENTORY_ITEMS_COLLECTION);
  const q = query(itemsCol, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => fromFirestoreInventoryItem(docSnap));
};

export const addInventoryItemFS = async (data: InventoryItemFormValues): Promise<string> => {
  const firestoreData = toFirestoreInventoryItem(data, true);
  const docRef = await addDoc(collection(db, INVENTORY_ITEMS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateInventoryItemFS = async (id: string, data: Partial<InventoryItemFormValues>): Promise<void> => {
  const itemDocRef = doc(db, INVENTORY_ITEMS_COLLECTION, id);
  const firestoreData = toFirestoreInventoryItem(data, false);
  await updateDoc(itemDocRef, firestoreData);
};

export const deleteInventoryItemFS = async (id: string): Promise<void> => {
  const itemDocRef = doc(db, INVENTORY_ITEMS_COLLECTION, id);
  await deleteDoc(itemDocRef);
};
