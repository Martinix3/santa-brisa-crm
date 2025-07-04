

'use server';

import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, Timestamp, runTransaction, type Transaction } from 'firebase/firestore';
import type { Purchase, ItemBatch, StockTxn, InventoryItem, UoM, Currency } from '@/types';

const ITEM_BATCHES_COLLECTION = 'itemBatches';
const STOCK_TXNS_COLLECTION = 'stockTxns';
const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';

/**
 * Creates ItemBatch and StockTxn documents based on a purchase.
 * This function should be called within a Firestore transaction.
 * @param purchaseId The ID of the parent purchase document.
 * @param purchaseData The data of the purchase.
 * @param transaction The Firestore transaction object.
 */
export async function seedItemBatches(
  purchaseId: string,
  purchaseData: Partial<Purchase>,
  transaction: Transaction
): Promise<void> {
  if (!purchaseData.items || purchaseData.items.length === 0) {
    console.warn(`No items found in purchase ${purchaseId}. Skipping batch creation.`);
    return;
  }
  
  console.log(`Seeding batches for purchase ${purchaseId}`);

  // Calculate proportional shipping cost per item
  const subtotal = purchaseData.subtotal || 0;
  const shippingCost = purchaseData.shippingCost || 0;

  for (const item of purchaseData.items) {
    if (!item.materialId || !item.quantity || !item.unitPrice) {
      console.warn('Skipping item in purchase due to missing data:', item);
      continue;
    }
    
    // Fetch the inventory item to get its UoM
    const inventoryItemRef = doc(db, INVENTORY_ITEMS_COLLECTION, item.materialId);
    const inventoryItemDoc = await transaction.get(inventoryItemRef);
    if (!inventoryItemDoc.exists()) {
        throw new Error(`Inventory item ${item.materialId} not found. Transaction will be rolled back.`);
    }
    const itemData = inventoryItemDoc.data();
    const itemUom = (itemData?.uom as UoM) || 'unit'; // Default to 'unit' if not present

    const itemTotal = item.quantity * item.unitPrice;
    const shippingProportion = subtotal > 0 ? (itemTotal / subtotal) : 0;
    const proportionalShippingCost = shippingCost * shippingProportion;
    const landedUnitCost = (itemTotal + proportionalShippingCost) / item.quantity;

    // 1. Create ItemBatch document
    const newItemBatchRef = doc(collection(db, ITEM_BATCHES_COLLECTION));
    const newItemBatch: Omit<ItemBatch, 'id'> = {
      purchaseId: purchaseId,
      sku: item.materialId,
      supplierBatchCode: item.batchNumber || undefined,
      qtyInitial: item.quantity,
      uom: itemUom, 
      unitCost: landedUnitCost,
      createdAt: new Date().toISOString(),
    };
    transaction.set(newItemBatchRef, newItemBatch);
    console.log(`  - Queued ItemBatch creation for SKU ${item.materialId}, Batch ID: ${newItemBatchRef.id}`);

    // 2. Create StockTxn document
    const newStockTxnRef = doc(collection(db, STOCK_TXNS_COLLECTION));
    const newStockTxn: Omit<StockTxn, 'id'> = {
      date: new Date().toISOString(),
      sku: item.materialId,
      batchId: newItemBatchRef.id,
      qtyDelta: item.quantity,
      costDelta: item.quantity * landedUnitCost,
      uom: itemUom,
      currency: purchaseData.currency || 'EUR',
      txnType: 'receive',
      refCollection: 'purchases',
      refId: purchaseId,
      costCenterIds: purchaseData.costCenterIds || [],
      createdAt: new Date().toISOString(),
    };
    transaction.set(newStockTxnRef, newStockTxn);
    console.log(`  - Queued StockTxn creation for SKU ${item.materialId}, Txn ID: ${newStockTxnRef.id}`);

    // 3. Update the total stock of the inventory item
    const currentStock = inventoryItemDoc.data()!.stock || 0;
    transaction.update(inventoryItemRef, { stock: currentStock + item.quantity });
    console.log(`  - Queued stock update for SKU ${item.materialId}. Old stock: ${currentStock}, New stock: ${currentStock + item.quantity}`);
  }
}
