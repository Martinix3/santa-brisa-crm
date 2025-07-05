
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, Timestamp, type Transaction } from "firebase/firestore";
import type { ProductCostSnapshot } from '@/types';

const SNAPSHOTS_COLLECTION = 'productCostSnapshots';

/**
 * Creates a new product cost snapshot document within a Firestore transaction.
 * @param transaction The Firestore transaction object.
 * @param data The data for the new cost snapshot.
 */
export const addProductCostSnapshotFSTransactional = async (
    transaction: Transaction,
    data: Omit<ProductCostSnapshot, 'id' | 'date'>
): Promise<void> => {
    const snapshotRef = doc(collection(db, SNAPSHOTS_COLLECTION));
    const dataToSave: Omit<ProductCostSnapshot, 'id'> = {
        ...data,
        date: Timestamp.now(),
    };
    transaction.set(snapshotRef, dataToSave);
};
