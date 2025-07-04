
'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, orderBy,
  type DocumentSnapshot,
} from "firebase/firestore";
import type { CostCenter } from '@/types';

const COSTCENTERS_COLLECTION = 'costCenters';

const fromFirestoreCostCenter = (snapshot: DocumentSnapshot): CostCenter => {
    const data = snapshot.data();
    if (!data) throw new Error("Cost Center data is undefined.");
    return {
        id: snapshot.id,
        name: data.name,
        type: data.type,
        parentId: data.parentId || undefined,
    };
};

export const getCostCentersFS = async (): Promise<CostCenter[]> => {
    const costCentersCol = collection(db, COSTCENTERS_COLLECTION);
    const q = query(costCentersCol, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(fromFirestoreCostCenter);
};

export const getCostCenterByIdFS = async (id: string): Promise<CostCenter | null> => {
    if (!id) return null;
    const docRef = doc(db, COSTCENTERS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? fromFirestoreCostCenter(snapshot) : null;
};

export const addCostCenterFS = async (costCenter: Omit<CostCenter, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, COSTCENTERS_COLLECTION), costCenter);
    return docRef.id;
};

export const updateCostCenterFS = async (id: string, costCenter: Partial<Omit<CostCenter, 'id'>>): Promise<void> => {
    const docRef = doc(db, COSTCENTERS_COLLECTION, id);
    await updateDoc(docRef, costCenter);
};

export const deleteCostCenterFS = async (id: string): Promise<void> => {
    const docRef = doc(db, COSTCENTERS_COLLECTION, id);
    await deleteDoc(docRef);
};
