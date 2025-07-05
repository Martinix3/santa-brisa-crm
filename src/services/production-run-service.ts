
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, where, limit, type DocumentReference, type DocumentSnapshot, setDoc } from "firebase/firestore";
import type { ProductionRun, ProductionRunFormValues, InventoryItem, BomLine, ItemBatch } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { fromFirestoreProductionRun, fromFirestoreBomLine } from './utils/firestore-converters';
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

/**
 * Creates a "Legacy Stock" batch if the stock in InventoryItem is greater
 * than the sum of stock in all existing batches for that item.
 * This is a lazy migration helper to reconcile pre-existing stock.
 */
async function reconcileLegacyStock(item: InventoryItem): Promise<void> {
    const canonicalStock = item.stock || 0;
    if (canonicalStock <= 0) {
      return; // No legacy stock to reconcile
    }
  
    const batchesQuery = query(
      collection(db, BATCHES_COLLECTION),
      where('inventoryItemId', '==', item.id)
    );
    const batchesSnapshot = await getDocs(batchesQuery);
    
    const batchedStock = batchesSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().qtyRemaining || 0),
      0
    );
  
    const discrepancy = canonicalStock - batchedStock;
  
    if (discrepancy > 0.001) { // Use a small tolerance for floating point
      console.log(`Reconciling legacy stock for ${item.name}. Discrepancy: ${discrepancy}`);
      const newBatchRef = doc(collection(db, BATCHES_COLLECTION));
      const skuPart = (item.sku ?? 'NA').substring(0,4).toUpperCase();
      const internalBatchCode = `LEGACY_${skuPart}_${newBatchRef.id.slice(0,4)}`;
      
      await setDoc(newBatchRef, {
        inventoryItemId: item.id,
        internalBatchCode,
        qtyInitial: discrepancy,
        qtyRemaining: discrepancy,
        uom: item.uom || 'unit',
        unitCost: item.latestPurchase?.calculatedUnitCost || 0,
        isClosed: false,
        createdAt: item.createdAt instanceof Timestamp
          ? item.createdAt
          : (item.createdAt ? Timestamp.fromMillis(parseISO(item.createdAt).getTime()) : Timestamp.fromMillis(Date.now() - 31536000000)), // Default to 1 year ago for FIFO
      });
    }
}


export const closeProductionRunFS = async (runId: string, qtyProduced: number) => {
    // --- PHASE 1: PRE-TRANSACTION READS & PREPARATION ---
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

    // LAZY MIGRATION: Reconcile stock for each component before planning.
    const componentDocs = await Promise.all(
      bomLines.map(line => getDoc(doc(db, INVENTORY_ITEMS_COLLECTION, line.componentId)))
    );
    for (const [index, componentDoc] of componentDocs.entries()) {
      if (componentDoc.exists()) {
        const itemData = { id: componentDoc.id, ...componentDoc.data() } as InventoryItem;
        await reconcileLegacyStock(itemData);
      } else {
        throw new Error(`El componente con nombre "${bomLines[index].componentName}" (ID: ${bomLines[index].componentId}) no existe en el inventario.`);
      }
    }

    // Plan consumption for all components outside the transaction
    const consumptionPlans = await Promise.all(
        bomLines.map((line, index) => {
          const componentDoc = componentDocs[index];
          const componentName = componentDoc.exists() ? componentDoc.data().name : line.componentName;
          return planBatchConsumption(line.componentId, line.quantity * qtyProduced, componentName, 'FIFO');
        })
    );
    
    // --- TRANSACTION START ---
    return runTransaction(db, async (transaction) => {
        // --- PHASE 2: GATHER ALL REFS & PERFORM ALL TRANSACTIONAL READS ---
        
        const refsToRead = new Map<string, DocumentReference>();
        refsToRead.set('runRef', runRef);
        refsToRead.set('finishedGoodRef', finishedGoodRef);
        
        // Add component item refs to read
        bomLines.forEach(line => {
             refsToRead.set(`component_${line.componentId}`, doc(db, INVENTORY_ITEMS_COLLECTION, line.componentId));
        });
        
        // Add batch refs to read
        consumptionPlans.flat().forEach(plan => {
            refsToRead.set(`batch_${plan.batchId}`, doc(db, BATCHES_COLLECTION, plan.batchId));
        });
        
        const docsRead = await Promise.all(
            Array.from(refsToRead.values()).map(ref => transaction.get(ref))
        );

        const docsMap = new Map<string, DocumentSnapshot>();
        Array.from(refsToRead.keys()).forEach((key, index) => {
            docsMap.set(key, docsRead[index]);
        });
        
        // --- PHASE 3: VALIDATE READ DATA & PREPARE WRITES ---
        
        const freshRunDoc = docsMap.get('runRef');
        if (!freshRunDoc || !freshRunDoc.exists() || freshRunDoc.data().status !== runData.status) {
             throw new Error("El estado de la orden de producción ha cambiado. Por favor, inténtelo de nuevo.");
        }
        const finishedGoodDoc = docsMap.get('finishedGoodRef');
        if (!finishedGoodDoc || !finishedGoodDoc.exists()) throw new Error("Producto terminado no encontrado en la transacción.");
        const finishedGoodData = { id: finishedGoodDoc.id, ...finishedGoodDoc.data() } as InventoryItem;


        let totalConsumedCost = 0;
        const consumedComponentsSnapshot: ProductionRun['consumedComponents'] = [];
        const totalConsumedByComponent: Record<string, number> = {};

        for (const [index, line] of bomLines.entries()) {
            for (const plan of consumptionPlans[index]) {
                const batchDoc = docsMap.get(`batch_${plan.batchId}`);
                
                if (!batchDoc || !batchDoc.exists()) throw new Error(`Lote ${plan.batchId} no encontrado.`);

                const batchData = batchDoc.data() as ItemBatch;

                if (batchData.qtyRemaining < plan.quantity) {
                    throw new Error(`El stock para el lote ${plan.batchId} (${line.componentName}) ha cambiado. La operación se reintentará.`);
                }
                
                const newQtyRemaining = batchData.qtyRemaining - plan.quantity;
                totalConsumedCost += plan.quantity * batchData.unitCost;
                
                // Queue the write, don't execute yet.
                const batchRef = refsToRead.get(`batch_${plan.batchId}`)!;
                transaction.update(batchRef, { qtyRemaining: newQtyRemaining, isClosed: newQtyRemaining <= 0 });
                
                consumedComponentsSnapshot.push({ componentId: line.componentId, batchId: plan.batchId, componentName: line.componentName, componentSku: line.componentSku, quantity: plan.quantity });
            }
            totalConsumedByComponent[line.componentId] = (totalConsumedByComponent[line.componentId] || 0) + (line.quantity * qtyProduced);
        }
        
        // --- PHASE 4: ALL WRITES ---

        // Loop to prepare component stock updates (these are just more writes)
        for(const componentId in totalConsumedByComponent) {
            const componentRef = refsToRead.get(`component_${componentId}`)!;
            const componentDoc = docsMap.get(`component_${componentId}`);
            if(componentDoc && componentDoc.exists()){
              const currentStock = componentDoc.data().stock || 0;
              const consumedQty = totalConsumedByComponent[componentId];
              const newStock = currentStock - consumedQty;
              transaction.update(componentRef, { stock: newStock });
              await addStockTxnFSTransactional(transaction, { inventoryItemId: componentId, batchId: 'multiple', qtyDelta: -consumedQty, newStock: newStock, txnType: 'consumo', refCollection: 'productionRuns', refId: runId, notes: `Consumo para ${runData.productName}`});
            }
        }

        const newUnitCost = qtyProduced > 0 ? totalConsumedCost / qtyProduced : 0;
        const newFinishedStock = (finishedGoodData.stock || 0) + qtyProduced;
        
        const outputBatchId = await createItemBatchTransactional(transaction, finishedGoodData, { purchaseId: runId, quantity: qtyProduced, unitCost: newUnitCost, locationId: 'produccion' });

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
