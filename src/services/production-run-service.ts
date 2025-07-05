
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, where, limit, type DocumentReference, type DocumentSnapshot } from "firebase/firestore";
import type { ProductionRun, ProductionRunFormValues, InventoryItem, BomLine, ItemBatch } from '@/types';
import { format } from 'date-fns';
import { fromFirestoreBomLine, fromFirestoreProductionRun } from './utils/firestore-converters';
import { addStockTxnFSTransactional } from './stock-txn-service';
import { addProductCostSnapshotFSTransactional } from './product-cost-snapshot-service';
import { createItemBatchTransactional, planBatchConsumption } from './batch-service';

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
    // PHASE 1: PRE-TRANSACTION READS & PREPARATION
    const runRef = doc(db, PRODUCTION_RUNS_COLLECTION, runId);
    const initialRunDoc = await getDoc(runRef);
    if (!initialRunDoc.exists() || (initialRunDoc.data().status !== 'En Progreso' && initialRunDoc.data().status !== 'Borrador')) {
        throw new Error("La orden de producción no existe o no está en un estado válido para finalizarla.");
    }
    const runData = fromFirestoreProductionRun(initialRunDoc);

    const bomLinesQuery = query(collection(db, BOM_LINES_COLLECTION), where('productSku', '==', runData.productSku));
    const bomLinesSnapshot = await getDocs(bomLinesQuery);
    const bomLines = bomLinesSnapshot.docs.map(fromFirestoreBomLine);
    if (bomLines.length === 0) throw new Error(`No se encontró una receta (BOM) para el producto con SKU ${runData.productSku}`);
    
    const finishedGoodQuery = query(collection(db, INVENTORY_ITEMS_COLLECTION), where('sku', '==', runData.productSku), limit(1));
    const finishedGoodSnapshot = await getDocs(finishedGoodQuery);
    if (finishedGoodSnapshot.empty) throw new Error(`El producto a fabricar con SKU ${runData.productSku} no se encuentra en el inventario.`);
    const finishedGoodRef = finishedGoodSnapshot.docs[0].ref;

    // Plan consumption for all components
    const consumptionPlans = await Promise.all(
        bomLines.map(line => planBatchConsumption(line.componentId, line.quantity * qtyProduced))
    );

    // Collect all unique document references to be read transactionally
    const refsToRead: DocumentReference[] = [runRef, finishedGoodRef];
    bomLines.forEach(line => refsToRead.push(doc(db, INVENTORY_ITEMS_COLLECTION, line.componentId)));
    consumptionPlans.flat().forEach(plan => refsToRead.push(doc(db, BATCHES_COLLECTION, plan.batchId)));
    const uniqueRefsToRead = Array.from(new Set(refsToRead.map(r => r.path))).map(path => doc(db, path));
    
    // --- TRANSACTION START ---
    return runTransaction(db, async (transaction) => {
        // PHASE 2: TRANSACTIONAL READS
        const docsSnapshot = await Promise.all(uniqueRefsToRead.map(ref => transaction.get(ref)));
        const docsMap = new Map(docsSnapshot.map(snap => [snap.ref.path, snap]));

        const getDocFromMap = (ref: DocumentReference): DocumentSnapshot => {
            const doc = docsMap.get(ref.path);
            if (!doc) throw new Error(`Document with path ${ref.path} was not pre-fetched for transaction.`);
            return doc;
        };

        const freshRunDoc = getDocFromMap(runRef);
        if (!freshRunDoc.exists() || freshRunDoc.data().status !== runData.status) {
             throw new Error("El estado de la orden de producción ha cambiado. Por favor, inténtelo de nuevo.");
        }
        const finishedGoodData = getDocFromMap(finishedGoodRef).data() as InventoryItem;

        // PHASE 3: IN-MEMORY LOGIC & PREPARING WRITES
        let totalConsumedCost = 0;
        const consumedComponentsSnapshot: ProductionRun['consumedComponents'] = [];

        for (const [index, line] of bomLines.entries()) {
            const componentDoc = getDocFromMap(doc(db, INVENTORY_ITEMS_COLLECTION, line.componentId));
            const componentData = componentDoc.data() as InventoryItem;
            let totalStockForComponent = componentData.stock || 0;

            for (const plan of consumptionPlans[index]) {
                const batchRef = doc(db, BATCHES_COLLECTION, plan.batchId);
                const batchDoc = getDocFromMap(batchRef);
                const batchData = batchDoc.data() as ItemBatch;
                
                const newQtyRemaining = batchData.qtyRemaining - plan.quantity;
                totalConsumedCost += plan.quantity * batchData.unitCost;
                
                // Prepare writes
                transaction.update(batchRef, { qtyRemaining: newQtyRemaining, isClosed: newQtyRemaining <= 0 });
                totalStockForComponent -= plan.quantity;

                consumedComponentsSnapshot.push({ componentId: line.componentId, batchId: plan.batchId, componentName: line.componentName, componentSku: line.componentSku, quantity: plan.quantity });
                await addStockTxnFSTransactional(transaction, { inventoryItemId: line.componentId, batchId: plan.batchId, qtyDelta: -plan.quantity, newStock: totalStockForComponent, unitCost: batchData.unitCost, txnType: 'consumo', refCollection: 'productionRuns', refId: runId, notes: `Consumo para ${runData.productName}`});
            }
             transaction.update(componentDoc.ref, { stock: totalStockForComponent });
        }

        const newUnitCost = qtyProduced > 0 ? totalConsumedCost / qtyProduced : 0;
        const outputBatchId = await createItemBatchTransactional(transaction, finishedGoodData, { purchaseId: runId, quantity: qtyProduced, unitCost: newUnitCost });
        const newFinishedStock = (finishedGoodData.stock || 0) + qtyProduced;
        
        // --- PHASE 4: TRANSACTIONAL WRITES ---
        await addStockTxnFSTransactional(transaction, { inventoryItemId: finishedGoodRef.id, batchId: outputBatchId, qtyDelta: qtyProduced, newStock: newFinishedStock, unitCost: newUnitCost, refCollection: 'productionRuns', refId: runId, txnType: 'produccion', notes: `Producción de ${runData.productName}` });
        await addProductCostSnapshotFSTransactional(transaction, { inventoryItemId: finishedGoodRef.id, unitCost: newUnitCost, productionRunId: runId });
        
        transaction.update(finishedGoodRef, {
            stock: newFinishedStock,
            latestPurchase: { ...(finishedGoodData.latestPurchase || {}), calculatedUnitCost: newUnitCost, purchaseDate: format(new Date(), 'yyyy-MM-dd') }
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
