
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { collection, addDoc, Timestamp, type Transaction, doc } from "firebase-admin/firestore";
import type { StockTxn } from '@/types';

const STOCK_TXNS_COLLECTION = 'stockTxns';

/**
 * Creates a new stock transaction document within a Firestore transaction.
 * @param transaction The Firestore transaction object.
 * @param data The data for the new stock transaction.
 */
export const addStockTxnFSTransactional = async (
    transaction: Transaction,
    data: Omit<StockTxn, 'id' | 'date' | 'createdAt'>
): Promise<void> => {
    const txnRef = doc(collection(adminDb, STOCK_TXNS_COLLECTION));
    const now = Timestamp.now();
    
    const dataToSave: Omit<StockTxn, 'id'> = {
        ...data,
        date: now,
        createdAt: now,
    };
    
    transaction.set(txnRef, dataToSave);
};
