
'use server';

import { db } from '@/lib/firebase';
import { doc, type Transaction, type DocumentSnapshot } from "firebase/firestore";
import type { Purchase, PurchaseFirestorePayload } from '@/types';
import { format } from 'date-fns';

/**
 * Updates the stock for inventory items based on a purchase document.
 * This function is designed to be called from within a Firestore transaction.
 * @param transaction The Firestore transaction object.
 * @param oldPurchaseData The previous state of the purchase document, or null if it's a new purchase.
 * @param newPurchaseData The new state of the purchase document, or null if it's being deleted.
 * @param materialDocsMap A pre-fetched map of material documents involved in the transaction.
 */
export async function updateStockForPurchase(
    transaction: Transaction,
    oldPurchaseData: Purchase | null,
    newPurchaseData: PurchaseFirestorePayload | null,
    materialDocsMap: Map<string, DocumentSnapshot>
) {
    const stockDeltas = new Map<string, number>();
    const oldStatusWasReceived = oldPurchaseData?.status === 'Factura Recibida';
    const newStatusIsReceived = newPurchaseData?.status === 'Factura Recibida';

    // If the old purchase was 'received', we need to subtract its quantities to revert the stock.
    if (oldStatusWasReceived) {
        (oldPurchaseData!.items || []).forEach(oldItem => {
            if (oldItem.materialId && oldItem.quantity) {
                stockDeltas.set(oldItem.materialId, (stockDeltas.get(oldItem.materialId) || 0) - oldItem.quantity);
            }
        });
    }

    // If the new purchase is 'received', we need to add its quantities to the stock.
    if (newStatusIsReceived) {
        (newPurchaseData!.items || []).forEach(newItem => {
            if (newItem.materialId && newItem.quantity) {
                stockDeltas.set(newItem.materialId, (stockDeltas.get(newItem.materialId) || 0) + newItem.quantity);
            }
        });
    }
    
    // Apply stock changes
    for (const [materialId, delta] of stockDeltas.entries()) {
        if (delta !== 0) {
            const materialInfo = materialDocsMap.get(materialId);
            if (materialInfo && materialInfo.exists()) {
                const currentStock = materialInfo.data().stock || 0;
                transaction.update(materialInfo.ref, { stock: currentStock + delta });
            }
        }
    }
    
    // Update latest purchase info if the new status is 'received'
    if (newStatusIsReceived) {
        for (const item of newPurchaseData!.items || []) {
            if (item.materialId) {
                const materialInfo = materialDocsMap.get(item.materialId);
                if (materialInfo && materialInfo.exists()) {
                    const newLatestPurchase = {
                        quantityPurchased: item.quantity,
                        totalPurchaseCost: (item.quantity || 0) * (item.unitPrice || 0),
                        purchaseDate: format(newPurchaseData!.orderDate.toDate(), "yyyy-MM-dd"),
                        calculatedUnitCost: item.unitPrice,
                        notes: newPurchaseData!.notes || `Compra`,
                        batchNumber: item.batchNumber || null,
                    };
                    transaction.update(materialInfo.ref, { latestPurchase: newLatestPurchase });
                }
            }
        }
    }
}
