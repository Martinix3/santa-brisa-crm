
'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, doc as firestoreDoc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, where, writeBatch
} from "firebase/firestore";
import type { BomLine, UoM } from '@/types';
import { fromFirestoreBomLine } from './utils/firestore-converters';

const BOM_LINES_COLLECTION = 'bomLines';

interface BomComponentValues {
  componentId: string;
  componentName: string;
  componentSku?: string;
  quantity: number;
  uom: UoM;
}

export async function saveRecipeFS(productSku: string, components: BomComponentValues[]): Promise<void> {
  const batch = writeBatch(db);

  // 1. Find and queue deletion of all existing lines for this product
  const q = query(collection(db, BOM_LINES_COLLECTION), where('productSku', '==', productSku));
  const snapshot = await getDocs(q);
  snapshot.forEach(docToDelete => {
    batch.delete(docToDelete.ref);
  });

  // 2. Queue creation of all the new lines
  components.forEach(component => {
    const newDocRef = firestoreDoc(collection(db, BOM_LINES_COLLECTION));
    const dataToAdd = {
      productSku: productSku,
      componentId: component.componentId,
      componentName: component.componentName,
      componentSku: component.componentSku || null,
      quantity: component.quantity,
      uom: component.uom,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    batch.set(newDocRef, dataToAdd);
  });

  // 3. Commit all changes at once
  await batch.commit();
};

export async function deleteRecipeFS(productSku: string): Promise<void> {
  const batch = writeBatch(db);
  const q = query(collection(db, BOM_LINES_COLLECTION), where('productSku', '==', productSku));
  const snapshot = await getDocs(q);
  snapshot.forEach(docToDelete => {
    batch.delete(docToDelete.ref);
  });
  await batch.commit();
}


export async function getBomLinesFS(productSku?: string): Promise<BomLine[]> {
  const q = productSku 
    ? query(collection(db, BOM_LINES_COLLECTION), where('productSku', '==', productSku))
    : query(collection(db, BOM_LINES_COLLECTION), orderBy('productSku'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(fromFirestoreBomLine);
};
