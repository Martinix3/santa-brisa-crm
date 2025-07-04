
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, Timestamp, type Transaction } from "firebase/firestore";
import type { ProductCostSnapshot } from '@/types';

const SNAPSHOTS_COLLECTION = 'productCostSnapshots';

export const addProductCostSnapshotFSTransactional = async (
    transaction: Transaction,
    data: Omit<ProductCostSnapshot, 'id' | 'date'>
): Promise<void> => {
    const snapshotRef = doc(collection(db, SNAPSHOTS_COLLECTION));
    const dataToSave = {
        ...data,
        date: Timestamp.now(),
    };
    transaction.set(snapshotRef, dataToSave);
};
