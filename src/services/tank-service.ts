import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, Timestamp, orderBy, type DocumentSnapshot, updateDoc, addDoc,
} from "firebase/firestore";
import type { Tank, TankStatus, TankFormValues } from '@/types';
import { format } from 'date-fns';

const TANKS_COLLECTION = 'tanks';

const fromFirestoreTank = (snapshot: DocumentSnapshot): Tank => {
    const data = snapshot.data();
    if (!data) throw new Error("Tank data is undefined.");
    
    const toDateString = (ts: any): string => {
        if (!ts) return new Date().toISOString();
        if (ts instanceof Timestamp) return ts.toDate().toISOString();
        return new Date(ts).toISOString();
    };

    return {
        id: snapshot.id,
        name: data.name,
        capacity: data.capacity,
        status: data.status,
        currentBatchId: data.currentBatchId,
        currentQuantity: data.currentQuantity,
        currentUom: data.currentUom,
        location: data.location,
        createdAt: toDateString(data.createdAt),
        updatedAt: toDateString(data.updatedAt),
    };
};

export const getTanksFS = async (): Promise<Tank[]> => {
    const tanksCol = collection(db, TANKS_COLLECTION);
    const q = query(tanksCol, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(fromFirestoreTank);
};

export const updateTankFS = async (id: string, data: Partial<TankFormValues>): Promise<void> => {
    const docRef = doc(db, TANKS_COLLECTION, id);
    const updateData: { [key: string]: any } = {
        ...data,
        updatedAt: Timestamp.now(),
    };
    if (data.currentBatchId !== undefined) {
        updateData.currentBatchId = data.currentBatchId || null;
    }
    if (data.currentQuantity !== undefined) {
        updateData.currentQuantity = data.currentQuantity || null;
    }
    if (data.currentUom !== undefined) {
        updateData.currentUom = data.currentUom || null;
    }

    if (data.status === 'Libre') {
        updateData.currentBatchId = null;
        updateData.currentQuantity = null;
        updateData.currentUom = null;
    }
    
    await updateDoc(docRef, updateData);
};


export const addTankFS = async (data: TankFormValues): Promise<string> => {
    const newTankData = {
        ...data,
        status: 'Libre',
        currentBatchId: null,
        currentQuantity: null,
        currentUom: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, TANKS_COLLECTION), newTankData);
    return docRef.id;
};
