
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import {
  collection, query, getDocs, doc as firestoreDoc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, where, writeBatch, runTransaction
} from "firebase-admin/firestore";
import type { BomLine, InventoryItemFormValues, Category } from '@/types';
import { fromFirestoreBomLine } from './utils/firestore-converters';
import { addInventoryItemFS } from './inventory-item-service';
import { UdM as UoM, TipoBOM as BomKind } from "@ssot";

const BOM_LINES_COLLECTION = 'bomLines';

interface BomComponentValues {
  componentId: string;
  componentName: string;
  componentSku?: string;
  quantity: number;
  uom: UoM;
}

export async function saveRecipeFS(productSku: string, components: BomComponentValues[], type: BomKind): Promise<void> {
  const batch = writeBatch(adminDb);

  // 1. Find and queue deletion of all existing lines for this product
  const q = adminDb.collection(BOM_LINES_COLLECTION).where('productSku', '==', productSku);
  const snapshot = await q.get();
  snapshot.forEach(docToDelete => {
    batch.delete(docToDelete.ref);
  });

  // 2. Queue creation of all the new lines
  components.forEach(component => {
    const newDocRef = firestoreDoc(collection(adminDb, BOM_LINES_COLLECTION));
    const dataToAdd = {
      productSku: productSku,
      componentId: component.componentId,
      componentName: component.componentName,
      componentSku: component.componentSku || null,
      quantity: component.quantity,
      uom: component.uom,
      type: type,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    batch.set(newDocRef, dataToAdd);
  });

  // 3. Commit all changes at once
  await batch.commit();
};

export async function deleteRecipeFS(productSku: string): Promise<void> {
  const batch = writeBatch(adminDb);
  const q = adminDb.collection(BOM_LINES_COLLECTION).where('productSku', '==', productSku);
  const snapshot = await q.get();
  snapshot.forEach(docToDelete => {
    batch.delete(docToDelete.ref);
  });
  await batch.commit();
}


export const getBomLinesFS = async (productSku?: string, type?: BomKind): Promise<BomLine[]> => {
  let q: FirebaseFirestore.Query = adminDb.collection(BOM_LINES_COLLECTION);
  
  if (productSku) {
    q = q.where('productSku', '==', productSku);
  }
  if (type) {
    q = q.where('type', '==', type);
  }

  if (!productSku && !type) {
      q = q.orderBy('productSku');
  }
  
  const snapshot = await q.get();
  return snapshot.docs.map(fromFirestoreBomLine);
};

// Wrapper function to handle new product creation and recipe saving
export const createNewProductAndRecipeFS = async (
  newProductName: string,
  finishedGoodsCategoryId: string,
  components: BomComponentValues[],
  type: BomKind
): Promise<{ id: string, sku: string }> => {
  return await runTransaction(adminDb, async (transaction) => {
    // 1. Create the new inventory item, which now returns the generated SKU
    const { id: newProductId, sku: newProductSku } = await addInventoryItemFS({
      name: newProductName,
      categoryId: finishedGoodsCategoryId,
    }, transaction);

    if (!newProductSku) {
      throw new Error("Failed to generate a new SKU for the product.");
    }
    
    // 2. Save the recipe using the newly generated SKU
    // Since saveRecipeFS uses writeBatch, we cannot pass the transaction directly.
    // Instead, we replicate its logic inside this transaction.
    const bomColRef = collection(adminDb, BOM_LINES_COLLECTION);
    
    // No need to delete since it's a new product.
    
    components.forEach(component => {
      const newDocRef = firestoreDoc(bomColRef);
      const dataToAdd = {
        productSku: newProductSku,
        componentId: component.componentId,
        componentName: component.componentName,
        componentSku: component.componentSku || null,
        quantity: component.quantity,
        uom: component.uom,
        type: type,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      transaction.set(newDocRef, dataToAdd);
    });

    return { id: newProductId, sku: newProductSku };
  });
};
