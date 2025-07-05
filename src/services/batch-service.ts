
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, query, where, orderBy, getDocs, Timestamp, type Transaction } from "firebase/firestore";
import type { ItemBatch, InventoryItem } from '@/types';
import { format } from 'date-fns';

const BATCHES_COLLECTION = 'itemBatches';

export const createItemBatchTransactional = async (
    transaction: Transaction,
    item: InventoryItem,
    purchaseData: { purchaseId: string, supplierBatchCode?: string, quantity: number, unitCost: number, locationId?: string, expiryDate?: Date }
): Promise<string> => {
    const newBatchRef = doc(collection(db, BATCHES_COLLECTION));
    const internalBatchCode = `B${format(new Date(), 'yyMMdd')}-${item.sku || 'NA'}-${newBatchRef.id.substring(0,4).toUpperCase()}`;

    const newBatch: ItemBatch = {
        id: newBatchRef.id,
        inventoryItemId: item.id,
        internalBatchCode,
        supplierBatchCode: purchaseData.supplierBatchCode,
        qtyInitial: purchaseData.quantity,
        qtyRemaining: purchaseData.quantity,
        uom: item.uom,
        unitCost: purchaseData.unitCost,
        expiryDate: purchaseData.expiryDate?.toISOString(),
        locationId: purchaseData.locationId,
        isClosed: false,
        createdAt: Timestamp.now(),
    };

    transaction.set(newBatchRef, newBatch);
    return newBatch.id;
};

export const consumeFromBatchesTransactional = async (
    transaction: Transaction,
    inventoryItemId: string,
    quantityToConsume: number,
    strategy: 'FIFO' | 'FEFO' = 'FIFO'
): Promise<{ consumedBatches: { batchId: string, quantity: number }[], totalCost: number }> => {
    
    const batchesQuery = query(
        collection(db, BATCHES_COLLECTION),
        where("inventoryItemId", "==", inventoryItemId),
        where("isClosed", "==", false),
        where("qtyRemaining", ">", 0),
        orderBy(strategy === 'FEFO' ? 'expiryDate' : 'createdAt', 'asc')
    );
    
    // Note: Firestore transactions do not support queries directly.
    // This read must happen BEFORE the transaction starts, or you must read documents one-by-one inside.
    // For simplicity in this service, we assume the calling function handles the transaction boundary.
    // The calling function (`closeProductionRunFS`) will fetch these docs outside/at the start of the transaction.
    const snapshot = await getDocs(batchesQuery);
    
    const availableBatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItemBatch));
    
    let remainingToConsume = quantityToConsume;
    const consumedBatches: { batchId: string, quantity: number }[] = [];
    let totalCost = 0;

    for (const batch of availableBatches) {
        if (remainingToConsume <= 0) break;

        const qtyFromThisBatch = Math.min(batch.qtyRemaining, remainingToConsume);
        const newQtyRemaining = batch.qtyRemaining - qtyFromThisBatch;

        const batchRef = doc(db, BATCHES_COLLECTION, batch.id);
        transaction.update(batchRef, {
            qtyRemaining: newQtyRemaining,
            isClosed: newQtyRemaining === 0,
        });

        consumedBatches.push({ batchId: batch.id, quantity: qtyFromThisBatch });
        totalCost += qtyFromThisBatch * batch.unitCost;
        remainingToConsume -= qtyFromThisBatch;
    }

    if (remainingToConsume > 0) {
        throw new Error(`Stock insuficiente para el artículo ${inventoryItemId}. Faltan ${remainingToConsume} unidades.`);
    }

    return { consumedBatches, totalCost };
};
