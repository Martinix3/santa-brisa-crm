
'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, where, type Transaction
} from "firebase/firestore";
import type { BomLine } from '@/types';
import { format } from 'date-fns';
import type { BomLineFormValues } from "@/components/app/bom-dialog";

const BOM_LINES_COLLECTION = 'bomLines';

const fromFirestore = (snapshot: any): BomLine => {
  const data = snapshot.data();
  if (!data) throw new Error("BOM Line data is undefined.");
  return {
    id: snapshot.id,
    productSku: data.productSku,
    componentSku: data.componentSku,
    quantity: data.quantity,
    uom: data.uom,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : undefined,
  };
};

const toFirestore = (data: BomLineFormValues, isNew: boolean): any => {
  const firestoreData = { ...data };
  if (isNew) {
    firestoreData.createdAt = Timestamp.now();
  }
  firestoreData.updatedAt = Timestamp.now();
  return firestoreData;
};

export const getBomLinesFS = async (productSku?: string): Promise<BomLine[]> => {
  const q = productSku 
    ? query(collection(db, BOM_LINES_COLLECTION), where('productSku', '==', productSku))
    : query(collection(db, BOM_LINES_COLLECTION), orderBy('productSku'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(fromFirestore);
};

export const getBomLinesFSTransactional = async (transaction: Transaction, productSku: string): Promise<BomLine[]> => {
    const q = query(collection(db, BOM_LINES_COLLECTION), where('productSku', '==', productSku));
    const snapshot = await transaction.get(q);
    return snapshot.docs.map(fromFirestore);
};

export const addBomLineFS = async (data: BomLineFormValues): Promise<string> => {
  const firestoreData = toFirestore(data, true);
  const docRef = await addDoc(collection(db, BOM_LINES_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateBomLineFS = async (id: string, data: BomLineFormValues): Promise<void> => {
  const docRef = doc(db, BOM_LINES_COLLECTION, id);
  const firestoreData = toFirestore(data, false);
  await updateDoc(docRef, firestoreData);
};

export const deleteBomLineFS = async (id: string): Promise<void> => {
  const docRef = doc(db, BOM_LINES_COLLECTION, id);
  await deleteDoc(docRef);
};
