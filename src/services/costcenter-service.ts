

import { adminDb } from '@/lib/firebaseAdmin';
import type { CostCenter } from '@/types';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

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
    const q = adminDb.collection(COSTCENTERS_COLLECTION).orderBy('name', 'asc');
    const snapshot = await q.get();
    return snapshot.docs.map(fromFirestoreCostCenter);
};

export const getCostCenterByIdFS = async (id: string): Promise<CostCenter | null> => {
    if (!id) return null;
    const docRef = adminDb.collection(COSTCENTERS_COLLECTION).doc(id);
    const snapshot = await docRef.get();
    return snapshot.exists() ? fromFirestoreCostCenter(snapshot) : null;
};

export const addCostCenterFS = async (costCenter: Omit<CostCenter, 'id'>): Promise<string> => {
    const docRef = await adminDb.collection(COSTCENTERS_COLLECTION).add(costCenter);
    return docRef.id;
};

export const updateCostCenterFS = async (id: string, costCenter: Partial<Omit<CostCenter, 'id'>>): Promise<void> => {
    const docRef = adminDb.collection(COSTCENTERS_COLLECTION).doc(id);
    await docRef.update(costCenter);
};

export const deleteCostCenterFS = async (id: string): Promise<void> => {
    const docRef = adminDb.collection(COSTCENTERS_COLLECTION).doc(id);
    await docRef.delete();
};
