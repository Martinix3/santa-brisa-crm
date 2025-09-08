

'use server';

import { db } from '@/lib/firebase';
import { collection, doc, query, where, orderBy, getDocs, Timestamp, type Transaction, type DocumentSnapshot, updateDoc } from "firebase/firestore";
import type { ItemBatch, InventoryItem, BatchFormValues } from '@/types';
import { fromFirestoreItemBatch } from './utils/firestore-converters';
import { generateRawMaterialInternalCode, generateFinishedGoodBatchCode } from '@/lib/coding';
import { format, parseISO, add } from 'date-fns';
import { UdM as UoM } from "@ssot";

const BATCHES_COLLECTION = 'itemBatches';

/**
 * Creates a batch for a received raw material within a transaction.
 * Generates an internal code based on supplier info.
 * @returns The ID of the newly created batch document.
 */
export const createRawMaterialBatchFSTransactional = async (
    transaction: Transaction,
    item: InventoryItem,
    data: { purchaseId: string; supplierId: string; supplierCode: string; supplierBatchCode: string; quantity: number; unitCost: number; locationId?: string; expiryDate?: Date }
): Promise<string> => {
    const newBatchRef = doc(collection(db, BATCHES_COLLECTION));
    const internalBatchCode = await generateRawMaterialInternalCode(data.supplierCode, data.supplierBatchCode);

    const newBatchData: Omit<ItemBatch, 'id'> = {
        inventoryItemId: item.id,
        supplierBatchCode: data.supplierBatchCode,
        internalBatchCode,
        qtyInitial: data.quantity,
        qtyRemaining: data.quantity,
        uom: item.uom,
        unitCost: data.unitCost,
        isClosed: false,
        createdAt: new Date().toISOString(),
        qcStatus: 'Pending',
        ...(data.expiryDate && { expiryDate: data.expiryDate.toISOString() }),
        ...(data.locationId && { locationId: data.locationId }),
    };

    transaction.set(newBatchRef, newBatchData);
    return newBatchRef.id;
};

/**
 * Creates a batch for a produced finished good within a transaction.
 * Generates an internal code based on production info.
 * @returns An object containing the new batch's document ID and its internal code.
 */
export const createFinishedGoodBatchFSTransactional = async (
    transaction: Transaction,
    item: InventoryItem,
    data: { productionRunId: string; line: number; quantity: number; unitCost: number; locationId?: string; expiryDate?: Date }
): Promise<{ batchId: string; internalBatchCode: string }> => {
    const newBatchRef = doc(collection(db, BATCHES_COLLECTION));
    const internalBatchCode = await generateFinishedGoodBatchCode(item.sku || 'UNKNOWN', data.line);
    
    const productionDate = new Date();
    const expiryDate = add(productionDate, { months: 18 });
    
    const newBatchData: Omit<ItemBatch, 'id'> = {
        inventoryItemId: item.id,
        internalBatchCode,
        qtyInitial: data.quantity,
        qtyRemaining: data.quantity,
        uom: item.uom,
        unitCost: data.unitCost,
        isClosed: false,
        createdAt: productionDate.toISOString(),
        qcStatus: 'Released',
        expiryDate: expiryDate.toISOString(), 
        locationId: data.locationId || "Almacén Principal",
        costLayers: [],
    };

    transaction.set(newBatchRef, newBatchData);
    return { batchId: newBatchRef.id, internalBatchCode };
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
    where("inventoryItemId", "==", inventoryItemId)
  );

  const snapshot = await getDocs(batchesQuery);
  
  let availableBatches = snapshot.docs
    .map(fromFirestoreItemBatch)
    .filter(batch => !batch.isClosed && batch.qcStatus === 'Released' && batch.qtyRemaining > 0);

  availableBatches.sort((a, b) => {
      if (strategy === 'FEFO') {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return parseISO(a.expiryDate).getTime() - parseISO(b.expiryDate).getTime();
      }
      return parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime();
  });


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

export const getStockDetailsForItem = async (itemId: string): Promise<{ available: number; pending: number; }> => {
    if (!itemId) return { available: 0, pending: 0 };
    const q = query(collection(db, BATCHES_COLLECTION), where('inventoryItemId', '==', itemId));
    const snapshot = await getDocs(q);
    
    let available = 0;
    let pending = 0;

    snapshot.docs.forEach(doc => {
        const batch = doc.data() as ItemBatch;
        if (batch.isClosed) return;
        
        if (batch.qcStatus === 'Released') {
            available += batch.qtyRemaining;
        } else if (batch.qcStatus === 'Pending') {
            pending += batch.qtyRemaining;
        }
    });

    return { available, pending };
};


export const getAllBatchesFS = async (): Promise<ItemBatch[]> => {
    const q = query(collection(db, BATCHES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(fromFirestoreItemBatch);
};

export const getBatchesForItemFS = async (itemId: string): Promise<ItemBatch[]> => {
    if (!itemId) return [];
    const q = query(
        collection(db, BATCHES_COLLECTION), 
        where('inventoryItemId', '==', itemId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(fromFirestoreItemBatch);
}

export const updateBatchFS = async (id: string, data: Partial<BatchFormValues>): Promise<void> => {
  const docRef = doc(db, BATCHES_COLLECTION, id);
  const updateData: { [key: string]: any } = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  
  if (data.expiryDate !== undefined) {
    updateData.expiryDate = data.expiryDate ? format(data.expiryDate, "yyyy-MM-dd") : null;
  }
  
  await updateDoc(docRef, updateData);
};
