
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, query, where, orderBy, getDocs, Timestamp, type Transaction, type DocumentData, type DocumentReference, type DocumentSnapshot } from "firebase/firestore";
import type { ItemBatch, InventoryItem } from '@/types';
import { format } from 'date-fns';

const BATCHES_COLLECTION = 'itemBatches';

export const createItemBatchTransactional = async (
    transaction: Transaction,
    item: InventoryItem,
    purchaseData: { purchaseId: string, supplierBatchCode?: string, quantity: number, unitCost: number, locationId?: string, expiryDate?: Date }
): Promise<string> => {
    const newBatchRef = doc(collection(db, BATCHES_COLLECTION));
    const skuPart = (item.sku ?? 'NA').substring(0,4).toUpperCase();
    const internalBatchCode = `B${format(new Date(), 'yyMMdd')}-${skuPart}-${newBatchRef.id.slice(0,4).toUpperCase()}`;

    const newBatchData: {[key: string]: any} = {
        id: newBatchRef.id,
        inventoryItemId: item.id,
        internalBatchCode,
        qtyInitial: purchaseData.quantity,
        qtyRemaining: purchaseData.quantity,
        uom: item.uom,
        unitCost: purchaseData.unitCost,
        isClosed: false,
        createdAt: Timestamp.now(),
    };

    if (purchaseData.supplierBatchCode) {
        newBatchData.supplierBatchCode = purchaseData.supplierBatchCode;
    }
    if (purchaseData.expiryDate) {
        newBatchData.expiryDate = purchaseData.expiryDate.toISOString();
    }
    if (purchaseData.locationId) {
        newBatchData.locationId = purchaseData.locationId;
    }

    transaction.set(newBatchRef, newBatchData);
    return newBatchRef.id;
};

/**
 * Calculates the consumption plan for a given quantity of an item.
 * Reads available batches and determines which ones to use based on the strategy.
 * This function reads data but does NOT perform writes. It should be called OUTSIDE a transaction.
 * @param inventoryItemId The ID of the item to consume.
 * @param quantityToConsume The total quantity needed.
 * @param inventoryItemName Optional name of the item for better error messages.
 * @param strategy The consumption strategy (FIFO or FEFO).
 * @returns An array of objects, each specifying a batch ID and the quantity to consume from it.
 */
export async function planBatchConsumption(
  inventoryItemId: string,
  quantityToConsume: number,
  inventoryItemName?: string,
  strategy: 'FIFO' | 'FEFO' = 'FIFO'
): Promise<{ batchId: string; quantity: number; batchData: ItemBatch }[]> {
  const batchesQuery = query(
    collection(db, BATCHES_COLLECTION),
    where("inventoryItemId", "==", inventoryItemId),
    where("isClosed", "==", false),
    orderBy(strategy === 'FEFO' ? 'expiryDate' : 'createdAt', 'asc')
  );

  const snapshot = await getDocs(batchesQuery);
  const availableBatches = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as ItemBatch))
    .filter(batch => batch.qtyRemaining > 0);

  let remainingToConsume = quantityToConsume;
  const consumptionPlan: { batchId: string; quantity: number; batchData: ItemBatch }[] = [];
  let totalAvailable = 0;

  for (const batch of availableBatches) {
    totalAvailable += batch.qtyRemaining;
    if (remainingToConsume <= 0) break;
    const qtyFromThisBatch = Math.min(batch.qtyRemaining, remainingToConsume);
    consumptionPlan.push({ batchId: batch.id, quantity: qtyFromThisBatch, batchData: batch });
    remainingToConsume -= qtyFromThisBatch;
  }

  if (remainingToConsume > 0) {
    const userFriendlyName = inventoryItemName || inventoryItemId;
    throw new Error(`Stock insuficiente para el artículo "${userFriendlyName}". Se necesitan ${quantityToConsume}, pero solo hay ${totalAvailable} disponibles.`);
  }

  return consumptionPlan;
}
