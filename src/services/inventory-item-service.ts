import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, type DocumentSnapshot, runTransaction, FieldValue, where
} from "firebase/firestore";
import type { InventoryItem, InventoryItemFormValues, LatestPurchaseInfo, Category } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { generateSku } from '@/lib/coding';

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
  const itemsCol = collection(db, INVENTORY_ITEMS_COLLECTION);
  const q = query(itemsCol, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => fromFirestoreInventoryItem(docSnap));
};

export const getInventoryItemByIdFS = async (id: string): Promise<InventoryItem | null> => {
  if (!id) return null;
  const docRef = doc(db, INVENTORY_ITEMS_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return fromFirestoreInventoryItem(snapshot);
  }
  return null;
}

export const addInventoryItemFS = async (
  data: InventoryItemFormValues,
  transaction?: FirebaseFirestore.Transaction
): Promise<{ id: string; sku: string }> => {
  const categoryDocRef = doc(db, 'categories', data.categoryId);
  const categoryDoc = await (transaction ? transaction.get(categoryDocRef) : getDoc(categoryDocRef));
  if (!categoryDoc.exists()) throw new Error(`Category with ID ${data.categoryId} not found.`);
  const category = { id: categoryDoc.id, ...categoryDoc.data() } as Category;
  const newSku = await generateSku(data.name, category);
  
  const firestoreData: any = {
    ...toFirestoreInventoryItem(data),
    sku: newSku,
    stock: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (transaction) {
    const newDocRef = doc(collection(db, INVENTORY_ITEMS_COLLECTION));
    transaction.set(newDocRef, firestoreData);
    return { id: newDocRef.id, sku: newSku };
  } else {
    const docRef = await addDoc(collection(db, INVENTORY_ITEMS_COLLECTION), firestoreData);
    return { id: docRef.id, sku: newSku };
  }
};

export const updateInventoryItemFS = async (id: string, data: Partial<InventoryItemFormValues>): Promise<void> => {
  const itemDocRef = doc(db, INVENTORY_ITEMS_COLLECTION, id);
  const firestoreData = {
    ...toFirestoreInventoryItem(data),
    updatedAt: Timestamp.now(),
  };
  await updateDoc(itemDocRef, firestoreData);
};

export const deleteInventoryItemFS = async (id: string): Promise<void> => {
  const itemDocRef = doc(db, INVENTORY_ITEMS_COLLECTION, id);
  // Add logic here to check if item is used in BOMs or has stock before deleting
  await deleteDoc(itemDocRef);
};
