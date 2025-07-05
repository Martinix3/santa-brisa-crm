
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, where, limit, type DocumentSnapshot } from "firebase/firestore";
import type { ProductionRun, ProductionRunFormValues, InventoryItem, BomLine, ItemBatch } from '@/types';
import { format } from 'date-fns';
import { fromFirestoreBomLine, fromFirestoreProductionRun } from './utils/firestore-converters';
import { addStockTxnFSTransactional } from './stock-txn-service';
import { addProductCostSnapshotFSTransactional } from './product-cost-snapshot-service';
import { createItemBatchTransactional, consumeFromBatchesTransactional } from './batch-service';

const PRODUCTION_RUNS_COLLECTION = 'productionRuns';
const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';
const BOM_LINES_COLLECTION = 'bomLines';
const BATCHES_COLLECTION = 'itemBatches';

const toFirestore = (data: ProductionRunFormValues, isNew: boolean): any => {
  const firestoreData: Partial<ProductionRun> & { productSearchTerm?: string } = { ...data };
  delete firestoreData.productSearchTerm;
  if (isNew) {
    firestoreData.createdAt = format(new Date(), "yyyy-MM-dd");
    firestoreData.status = 'Borrador';
    firestoreData.startDate = format(new Date(), "yyyy-MM-dd");
    firestoreData.batchNumber = `PROD-${format(new Date(), 'yyyyMMddHHmmss')}`;
  }
  firestoreData.updatedAt = format(new Date(), "yyyy-MM-dd");
  return firestoreData;
};

export const getProductionRunsFS = async (): Promise<ProductionRun[]> => {
  const q = query(collection(db, PRODUCTION_RUNS_COLLECTION), orderBy('startDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(fromFirestoreProductionRun);
};

export const addProductionRunFS = async (data: ProductionRunFormValues): Promise<string> => {
  const firestoreData = toFirestore(data, true);
  const docRef = await addDoc(collection(db, PRODUCTION_RUNS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateProductionRunFS = async (id: string, data: Partial<ProductionRunFormValues>): Promise<void> => {
  const docRef = doc(db, PRODUCTION_RUNS_COLLECTION, id);
  await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
};

export const deleteProductionRunFS = async (id: string): Promise<void> => {
  const docRef = doc(db, PRODUCTION_RUNS_COLLECTION, id);
  await deleteDoc(docRef);
};


export const closeProductionRunFS = async (runId: string, qtyProduced: number) => {
    // 1. Get data outside the transaction to know what to read inside
    const runRef = doc(db, PRODUCTION_RUNS_COLLECTION, runId);
    const runDoc = await getDoc(runRef);
    if (!runDoc.exists() || (runDoc.data().status !== 'En Progreso' && runDoc.data().status !== 'Borrador')) {
        throw new Error("La orden de producción no existe o no está en un estado válido para finalizarla.");
    }
    const runData = fromFirestoreProductionRun(runDoc);
    
    const bomLinesQuery = query(collection(db, BOM_LINES_COLLECTION), where('productSku', '==', runData.productSku));
    const bomLinesSnapshot = await getDocs(bomLinesQuery);
    const bomLines = bomLinesSnapshot.docs.map(fromFirestoreBomLine);
    
    if (bomLines.length === 0) throw new Error(`No se encontró una receta (BOM) para el producto con SKU ${runData.productSku}`);

    const finishedGoodQuery = query(collection(db, INVENTORY_ITEMS_COLLECTION), where('sku', '==', runData.productSku), limit(1));
    const finishedGoodSnapshot = await getDocs(finishedGoodQuery);
    if (finishedGoodSnapshot.empty) {
        throw new Error(`El producto a fabricar con SKU ${runData.productSku} no se encuentra en el inventario.`);
    }
    const finishedGoodRef = finishedGoodSnapshot.docs[0].ref;
    const finishedGoodData = finishedGoodSnapshot.docs[0].data() as InventoryItem;

    return runTransaction(db, async (transaction) => {
        // --- STAGE 1: ALL READS ---
        const freshRunDoc = await transaction.get(runRef);
        if (!freshRunDoc.exists() || freshRunDoc.data().status !== runData.status) {
             throw new Error("El estado de la orden de producción ha cambiado. Por favor, inténtelo de nuevo.");
        }
        
        // --- STAGE 2: LOGIC & PREPARING WRITES ---
        let totalConsumedCost = 0;
        const consumedComponentsSnapshot: ProductionRun['consumedComponents'] = [];

        for (const line of bomLines) {
            const quantityToConsume = line.quantity * qtyProduced;
            
            // This is a simplified call; consumeFromBatchesTransactional would read batches internally.
            // For a strict transaction, batch documents would need to be read here.
            // We'll proceed assuming the reads inside consumeFromBatches happen before any writes.
            const { consumedBatches, totalCost } = await consumeFromBatchesTransactional(transaction, line.componentId, quantityToConsume);
            
            totalConsumedCost += totalCost;
            
            for (const consumed of consumedBatches) {
                consumedComponentsSnapshot.push({
                    componentId: line.componentId,
                    batchId: consumed.batchId,
                    componentName: line.componentName || 'N/A',
                    componentSku: line.componentSku,
                    quantity: consumed.quantity,
                });

                const componentDoc = await transaction.get(doc(db, INVENTORY_ITEMS_COLLECTION, line.componentId));
                const newStock = (componentDoc.data()?.stock || 0) - consumed.quantity;
                await addStockTxnFSTransactional(transaction, { 
                    inventoryItemId: line.componentId,
                    batchId: consumed.batchId,
                    qtyDelta: -consumed.quantity,
                    newStock,
                    txnType: 'consumo',
                    refCollection: 'productionRuns',
                    refId: runId,
                    notes: `Consumo para producción de ${runData.productName}`
                });
            }
        }

        const newUnitCost = qtyProduced > 0 ? totalConsumedCost / qtyProduced : 0;

        const outputBatchId = await createItemBatchTransactional(transaction, finishedGoodData, {
            purchaseId: runId, // Using runId as a reference
            quantity: qtyProduced,
            unitCost: newUnitCost,
        });

        const newFinishedStock = (finishedGoodData.stock || 0) + qtyProduced;
        
        await addStockTxnFSTransactional(transaction, {
            inventoryItemId: finishedGoodRef.id,
            batchId: outputBatchId,
            qtyDelta: qtyProduced,
            newStock: newFinishedStock,
            unitCost: newUnitCost,
            refCollection: 'productionRuns',
            refId: runId,
            txnType: 'produccion',
            notes: `Producción de ${runData.productName}`
        });
        
        await addProductCostSnapshotFSTransactional(transaction, {
            inventoryItemId: finishedGoodRef.id,
            unitCost: newUnitCost,
            productionRunId: runId
        });

        // --- STAGE 3: ALL WRITES ---
        transaction.update(finishedGoodRef, {
            stock: newFinishedStock,
            latestPurchase: { // Using latestPurchase to store the production cost
                ...(finishedGoodData.latestPurchase || {}),
                calculatedUnitCost: newUnitCost,
                purchaseDate: format(new Date(), 'yyyy-MM-dd'),
            }
        });

        transaction.update(runRef, {
            status: 'Finalizada',
            qtyProduced: qtyProduced,
            unitCost: newUnitCost,
            endDate: Timestamp.now(),
            consumedComponents: consumedComponentsSnapshot,
            outputBatchId: outputBatchId,
        });

        return { success: true, newUnitCost: newUnitCost };
    });
};
