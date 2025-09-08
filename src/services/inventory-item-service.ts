

import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import type { InventoryItem, InventoryItemFormValues, LatestPurchaseInfo, Category } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { generateSku } from '@/lib/coding';

const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';

const fromFirestoreInventoryItem = (docSnap: FirebaseFirestore.DocumentSnapshot): InventoryItem => {
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
    safetyStock: data.safetyStock,
    sku: data.sku || undefined,
    uom: data.uom || 'unit',
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : undefined),
  };
};

const toFirestoreInventoryItem = (data: Partial<InventoryItemFormValues>): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    description: data.description || null,
    categoryId: data.categoryId,
    uom: data.uom || 'unit',
  };

  if (data.safetyStock !== undefined && !isNaN(data.safetyStock)) {
    firestoreData.safetyStock = data.safetyStock;
  } else {
    firestoreData.safetyStock = null;
  }
  
  return firestoreData;
};

export const getInventoryItemsFS = async (): Promise<InventoryItem[]> => {
  const q = adminDb.collection(INVENTORY_ITEMS_COLLECTION).orderBy('name', 'asc');
  const snapshot = await q.get();
  return snapshot.docs.map(docSnap => fromFirestoreInventoryItem(docSnap));
};

export const getInventoryItemByIdFS = async (id: string): Promise<InventoryItem | null> => {
  if (!id) return null;
  const docRef = adminDb.collection(INVENTORY_ITEMS_COLLECTION).doc(id);
  const snapshot = await docRef.get();
  if (snapshot.exists) {
    return fromFirestoreInventoryItem(snapshot);
  }
  return null;
}

export const addInventoryItemFS = async (
  data: InventoryItemFormValues,
  transaction?: Transaction
): Promise<{ id: string; sku: string }> => {
  const categoryDocRef = adminDb.collection('categories').doc(data.categoryId);
  
  const categoryDoc = await (transaction ? transaction.get(categoryDocRef) : categoryDocRef.get());
  if (!categoryDoc.exists) throw new Error(`Category with ID ${data.categoryId} not found.`);
  
  const category = { id: categoryDoc.id, ...categoryDoc.data() } as Category;
  const newSku = await generateSku(data.name, category);
  
  const firestoreData: any = {
    ...toFirestoreInventoryItem(data),
    sku: newSku,
    stock: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const newDocRef = adminDb.collection(INVENTORY_ITEMS_COLLECTION).doc();

  if (transaction) {
    transaction.set(newDocRef, firestoreData);
  } else {
    await newDocRef.set(firestoreData);
  }

  return { id: newDocRef.id, sku: newSku };
};


export const updateInventoryItemFS = async (id: string, data: Partial<InventoryItemFormValues>): Promise<void> => {
  const itemDocRef = adminDb.collection(INVENTORY_ITEMS_COLLECTION).doc(id);
  const firestoreData = {
    ...toFirestoreInventoryItem(data),
    updatedAt: Timestamp.now(),
  };
  await itemDocRef.update(firestoreData);
};

export const deleteInventoryItemFS = async (id: string): Promise<void> => {
  const itemDocRef = adminDb.collection(INVENTORY_ITEMS_COLLECTION).doc(id);
  // Add logic here to check if item is used in BOMs or has stock before deleting
  await itemDocRef.delete();
};
