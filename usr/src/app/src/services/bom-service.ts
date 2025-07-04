
'use server';

import { db } from '../lib/firebase';
import {
  collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, where, type Transaction, writeBatch
} from "firebase/firestore";
import type { BomLine, UoM } from '@/types';
import { format } from 'date-fns';

const BOM_LINES_COLLECTION = 'bomLines';

export const fromFirestoreBomLine = (snapshot: any): BomLine => {
  const data = snapshot.data();
  if (!data) throw new Error("BOM Line data is undefined.");
  return {
    id: snapshot.id,
    productSku: data.productSku,
    componentId: data.componentId,
    componentName: data.componentName,
    componentSku: data.componentSku,
    quantity: data.quantity,
    uom: data.uom,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : undefined,
  };
};

interface BomComponentValues {
  componentId: string;
  componentName: string;
  componentSku?: string;
  quantity: number;
  uom: UoM;
}

export const saveRecipeFS = async (productSku: string, components: BomComponentValues[]): Promise<void> => {
  const batch = writeBatch(db);

  // 1. Find and queue deletion of all existing lines for this product
  const q = query(collection(db, BOM_LINES_COLLECTION), where('productSku', '==', productSku));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  // 2. Queue creation of all the new lines
  components.forEach(component => {
    const newDocRef = doc(collection(db, BOM_LINES_COLLECTION));
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

export const deleteRecipeFS = async (productSku: string): Promise<void> => {
  const batch = writeBatch(db);
  const q = query(collection(db, BOM_LINES_COLLECTION), where('productSku', '==', productSku));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}


export const getBomLinesFS = async (productSku?: string): Promise<BomLine[]> => {
  const q = productSku 
    ? query(collection(db, BOM_LINES_COLLECTION), where('productSku', '==', productSku))
    : query(collection(db, BOM_LINES_COLLECTION), orderBy('productSku'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(fromFirestoreBomLine);
};
