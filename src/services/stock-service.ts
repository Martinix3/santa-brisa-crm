
'use server';

import { db } from '@/lib/firebase';
import { doc, type Transaction, type DocumentSnapshot } from "firebase/firestore";
import type { Purchase, PurchaseFirestorePayload, InventoryItem } from '@/types';
import { addStockTxnFSTransactional } from './stock-txn-service';
import { createItemBatchTransactional } from './batch-service';

/**
 * Updates the stock for inventory items based on a purchase document.
 * This function is designed to be called from within a Firestore transaction.
 * All document reads must have been performed before this function is called.
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
    const oldStatusWasReceived = oldPurchaseData?.status === 'Factura Recibida';
    const newStatusIsReceived = newPurchaseData?.status === 'Factura Recibida';

    // Handle reversal of a previously received purchase
    if (oldStatusWasReceived && (!newPurchaseData || newPurchaseData.status !== 'Factura Recibida')) {
        // This is complex and potentially dangerous. A simple stock reversal is implemented.
        // A more robust system might prevent this or require a manual adjustment.
        console.warn(`Reverting stock from a previously received purchase (ID: ${oldPurchaseData?.id}). This may lead to stock inconsistencies if batches have been consumed.`);
        for (const item of oldPurchaseData!.items || []) {
            if (item.materialId) {
                const materialDoc = materialDocsMap.get(item.materialId);
                if (materialDoc && materialDoc.exists()) {
                    const delta = -item.quantity!;
                    const newStock = (materialDoc.data()!.stock || 0) + delta;
                    transaction.update(materialDoc.ref, { stock: newStock });
                    // NOTE: This does not delete the batch, which could be problematic.
                    // A full implementation would need to handle this.
                }
            }
        }
    }

    // Handle new reception of goods
    if (newStatusIsReceived && !oldStatusWasReceived) {
        for (const item of newPurchaseData!.items || []) {
            if (item.materialId) {
                const materialDoc = materialDocsMap.get(item.materialId);
                if (materialDoc && materialDoc.exists()) {
                    const materialData = materialDoc.data() as InventoryItem;
                    const delta = item.quantity || 0;
                    const newStock = (materialData.stock || 0) + delta;
                    
                    const batchId = await createBatchFn(transaction, materialData, {
                        purchaseId: newPurchaseData!.id,
                        supplierBatchCode: item.batchNumber || undefined,
                        quantity: delta,
                        unitCost: item.unitPrice || 0,
                    });

                    await addStockTxnFSTransactional(transaction, {
                        inventoryItemId: item.materialId,
                        batchId: batchId,
                        qtyDelta: delta,
                        newStock: newStock,
                        unitCost: item.unitPrice,
                        refCollection: 'purchases',
                        refId: newPurchaseData!.id,
                        txnType: 'recepcion',
                        notes: `Recepción desde compra a ${newPurchaseData!.supplier}`
                    });

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
