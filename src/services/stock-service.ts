
'use server';

import { db } from '@/lib/firebase';
import { doc, type Transaction, type DocumentSnapshot } from "firebase/firestore";
import type { Purchase, PurchaseFirestorePayload, InventoryItem } from '@/types';
import { addStockTxnFSTransactional } from './stock-txn-service';
import { createItemBatchTransactional } from './batch-service';

/**
 * Updates the stock for inventory items based on a purchase document.
 * This function is designed to be called from within a Firestore transaction.
 * @param transaction The Firestore transaction object.
 * @param oldPurchaseData The previous state of the purchase document, or null if it's a new purchase.
 * @param newPurchaseData The new state of the purchase document, or null if it's being deleted.
 * @param materialDocsMap A pre-fetched map of material documents involved in the transaction.
 * @param createBatchFn The transactional function to create a new batch.
 */
export async function updateStockForPurchase(
    transaction: Transaction,
    oldPurchaseData: Purchase | null,
    newPurchaseData: PurchaseFirestorePayload | null,
    materialDocsMap: Map<string, DocumentSnapshot>,
    createBatchFn: typeof createItemBatchTransactional
) {
    const stockDeltas = new Map<string, number>();
    const oldStatusWasReceived = oldPurchaseData?.status === 'Factura Recibida';
    const newStatusIsReceived = newPurchaseData?.status === 'Factura Recibida';

    if (oldStatusWasReceived) {
        // This part is complex because reverting batches is non-trivial.
        // For now, we assume once a purchase is 'Factura Recibida', it cannot be changed back easily.
        // A proper implementation would require reversing batch quantities or a more complex reconciliation.
        // Here, we'll simply log a warning if an attempt is made to revert a received purchase.
        if (newPurchaseData?.status !== 'Factura Recibida') {
             console.warn(`Reverting stock from a previously received purchase (ID: ${oldPurchaseData?.id}) is not fully supported and may lead to stock inconsistencies.`);
        }
    }

    if (newStatusIsReceived && oldPurchaseData?.status !== 'Factura Recibida') {
        // This is a new reception of goods.
        for (const item of newPurchaseData!.items || []) {
            if (item.materialId) {
                const materialDoc = materialDocsMap.get(item.materialId);
                if (materialDoc && materialDoc.exists()) {
                    const materialData = materialDoc.data() as InventoryItem;
                    const delta = item.quantity || 0;
                    const newStock = (materialData.stock || 0) + delta;
                    
                    // Create a new batch for this reception
                    const batchId = await createBatchFn(transaction, materialData, {
                        purchaseId: newPurchaseData!.id,
                        supplierBatchCode: item.batchNumber || undefined,
                        quantity: delta,
                        unitCost: item.unitPrice || 0,
                    });

                    // Create a stock transaction record for this batch reception
                    await addStockTxnFSTransactional(transaction, {
                        inventoryItemId: item.materialId,
                        batchId: batchId,
                        qtyDelta: delta,
                        newStock: newStock, // This is the new total stock for the item
                        unitCost: item.unitPrice,
                        refCollection: 'purchases',
                        refId: newPurchaseData!.id,
                        txnType: 'recepcion',
                        notes: `Recepción desde compra a ${newPurchaseData!.supplier}`
                    });

                    // Update the total stock and latest purchase info on the InventoryItem
                    transaction.update(materialDoc.ref, { 
                        stock: newStock,
                        latestPurchase: {
                            quantityPurchased: item.quantity,
                            totalPurchaseCost: (item.quantity || 0) * (item.unitPrice || 0),
                            purchaseDate: newPurchaseData!.orderDate.toDate().toISOString().split('T')[0],
                            calculatedUnitCost: item.unitPrice,
                            notes: newPurchaseData!.notes || `Compra`,
                            batchNumber: item.batchNumber || null,
                        }
                    });
                }
            }
        }
    }
}
