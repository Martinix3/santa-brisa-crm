import { db } from '@/lib/firebase';
import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, where, limit, type DocumentReference, type DocumentSnapshot, setDoc, increment, FieldValue, arrayUnion } from "firebase/firestore";
import type { ProductionRun, ProductionRunFormValues, InventoryItem, BomLine, ItemBatch, RunType, Shortage, ConsumptionPlanItem, FinishProductionRunFormValues, CleaningLog } from '@/types';
import { format, parseISO, isValid, differenceInMilliseconds } from 'date-fns';
import { fromFirestoreBomLine } from './utils/firestore-converters';
import { addStockTxnFSTransactional } from './stock-txn-service';
import { addProductCostSnapshotFSTransactional } from './product-cost-snapshot-service';
import { createFinishedGoodBatchFSTransactional, planBatchConsumption } from './batch-service';
import { generateProductionRunCode } from '@/lib/coding';

const PRODUCTION_RUNS_COLLECTION = 'productionRuns';
const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';
const BOM_LINES_COLLECTION = 'bomLines';
const BATCHES_COLLECTION = 'itemBatches';
const TANKS_COLLECTION = 'tanks';

const toFirestore = (data: ProductionRunFormValues, isNew: boolean): Partial<ProductionRun> & { [key: string]: any } => {
  const firestoreData: Partial<ProductionRun> & { [key: string]: any } = {
    type: data.type,
    productSku: data.productSku,
    productName: data.productName,
    qtyPlanned: data.qtyPlanned,
    lineId: data.lineId,
    tankId: data.tankId || null,
    startPlanned: data.startPlanned.toISOString(),
    notesPlan: data.notesPlan || null,
    updatedAt: new Date().toISOString(),
    maquilaCost: data.maquilaCost ?? null,
    maquilaTax: data.maquilaTax ?? null,
  };

  if (isNew) {
    firestoreData.createdAt = new Date().toISOString();
    firestoreData.status = 'Draft';
    firestoreData.reservations = [];
    firestoreData.shortages = data.shortages || [];
    firestoreData.cleaningLogs = [];
  }
  
  return firestoreData;
};

const fromFirestoreProductionRun = (snapshot: DocumentSnapshot): ProductionRun => {
  const data = snapshot.data();
  if (!data) throw new Error("Production run data is undefined.");

  const toDateString = (ts: any): string => {
      if (!ts) return new Date().toISOString();
      if (ts instanceof Timestamp) return ts.toDate().toISOString();
      if(typeof ts === 'string' && isValid(parseISO(ts))) return ts;
      if (typeof ts === 'object' && ts.seconds) {
        return new Timestamp(ts.seconds, ts.nanoseconds).toDate().toISOString();
      }
      return new Date(ts).toISOString();
  };
  
  return {
    id: snapshot.id,
    opCode: data.opCode,
    type: data.type,
    status: data.status,
    productSku: data.productSku,
    productName: data.productName,
    qtyPlanned: data.qtyPlanned,
    qtyActual: data.qtyActual,
    lineId: data.lineId,
    tankId: data.tankId,
    startPlanned: toDateString(data.startPlanned),
    startActual: data.startActual ? toDateString(data.startActual) : undefined,
    endActual: data.endActual ? toDateString(data.endActual) : undefined,
    lastPausedAt: data.lastPausedAt ? toDateString(data.lastPausedAt) : undefined,
    totalPauseDuration: data.totalPauseDuration,
    reservations: data.reservations || [],
    shortages: data.shortages || [],
    consumedComponents: data.consumedComponents || [],
    outputBatchId: data.outputBatchId,
    cleaningLogs: data.cleaningLogs || [],
    yieldPct: data.yieldPct,
    bottlesPerHour: data.bottlesPerHour,
    cost: data.cost,
    notesPlan: data.notesPlan,
    notesProd: data.notesProd,
    createdAt: toDateString(data.createdAt),
    updatedAt: toDateString(data.updatedAt),
    maquilaCost: data.maquilaCost,
    maquilaTax: data.maquilaTax,
  };
};

export const getProductionRunsFS = async (): Promise<ProductionRun[]> => {
  const q = query(collection(db, PRODUCTION_RUNS_COLLECTION), orderBy('startPlanned', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(fromFirestoreProductionRun);
};

export const addProductionRunFS = async (data: ProductionRunFormValues): Promise<string> => {
  const lineAsNumber = parseInt((data.lineId || '1').replace(/[^0-9]/g, ''), 10) || 1;
  const opCode = await generateProductionRunCode(lineAsNumber, data.type === 'blend' ? 'M' : 'E', data.startPlanned);
  const firestoreData = { ...toFirestore(data, true), opCode };
  const docRef = await addDoc(collection(db, PRODUCTION_RUNS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateProductionRunFS = async (id: string, data: Partial<ProductionRunFormValues>): Promise<void> => {
  const docRef = doc(db, PRODUCTION_RUNS_COLLECTION, id);
  const firestoreData = toFirestore(data as ProductionRunFormValues, false);
  await updateDoc(docRef, firestoreData);
};

export const deleteProductionRunFS = async (id: string): Promise<void> => {
  const docRef = doc(db, PRODUCTION_RUNS_COLLECTION, id);
  // The check for draft status has been removed to allow deletion of any run.
  // In a more complex scenario, you might want to reverse stock transactions here.
  // For now, we'll allow a direct deletion.
  await deleteDoc(docRef);
};


export const startProductionRunFS = async (runId: string, actualConsumption: ConsumptionPlanItem[], userId: string) => {
    const runRef = doc(db, PRODUCTION_RUNS_COLLECTION, runId);

    return runTransaction(db, async (transaction) => {
        // --- PHASE 1: READS ---
        const runDoc = await transaction.get(runRef);
        if (!runDoc.exists() || runDoc.data().status !== 'Draft') {
            throw new Error("La orden fue iniciada, modificada o no existe.");
        }
        const runData = fromFirestoreProductionRun(runDoc);

        const refsToRead = new Map<string, DocumentReference>();
        for (const consumedItem of actualConsumption) {
            refsToRead.set(`item/${consumedItem.componentId}`, doc(db, INVENTORY_ITEMS_COLLECTION, consumedItem.componentId));
            refsToRead.set(`batch/${consumedItem.batchId}`, doc(db, BATCHES_COLLECTION, consumedItem.batchId));
            if (consumedItem.batchData?.locationId) {
                 refsToRead.set(`tank/${consumedItem.batchData.locationId}`, doc(db, TANKS_COLLECTION, consumedItem.batchData.locationId));
            }
        }
        
        const readDocs = await Promise.all(
             Array.from(refsToRead.values()).map(ref => transaction.get(ref))
        );
        const docsMap = new Map<string, DocumentSnapshot>();
        Array.from(refsToRead.keys()).forEach((key, index) => {
            docsMap.set(key, readDocs[index]);
        });
        
        // --- PHASE 2: VALIDATION & PREPARATION ---
        const consumedComponentsLog: ProductionRun['consumedComponents'] = [];
        
        for (const consumedItem of actualConsumption) {
            const itemDoc = docsMap.get(`item/${consumedItem.componentId}`);
            const batchDoc = docsMap.get(`batch/${consumedItem.batchId}`);
            
            if (!batchDoc?.exists() || !itemDoc?.exists()) {
                throw new Error(`El lote o artículo para ${consumedItem.componentName} no se encontró dentro de la transacción.`);
            }

            const batchData = batchDoc.data() as ItemBatch;
            if (batchData.qtyRemaining < consumedItem.quantityToConsume) {
                throw new Error(`Stock insuficiente para ${consumedItem.componentName} (Lote ${consumedItem.batchInternalCode}) detectado durante la transacción.`);
            }

            const logEntry = {
                componentId: consumedItem.componentId,
                batchId: consumedItem.batchId,
                componentName: consumedItem.componentName,
                componentSku: consumedItem.componentSku || null,
                quantity: consumedItem.quantityToConsume,
                supplierBatchCode: consumedItem.supplierBatchCode || null,
                unitCost: consumedItem.unitCost || 0,
            };
            consumedComponentsLog.push(logEntry);
        }

        // --- PHASE 3: WRITES ---
        for (const consumedItem of actualConsumption) {
            const itemRef = doc(db, INVENTORY_ITEMS_COLLECTION, consumedItem.componentId);
            const batchRef = doc(db, BATCHES_COLLECTION, consumedItem.batchId);
            
            const itemDoc = docsMap.get(`item/${consumedItem.componentId}`)!;
            const batchDoc = docsMap.get(`batch/${consumedItem.batchId}`)!;
            
            const batchData = batchDoc.data() as ItemBatch;
            const newBatchQty = batchData.qtyRemaining - consumedItem.quantityToConsume;

            transaction.update(batchRef, { qtyRemaining: newBatchQty, isClosed: newBatchQty <= 0 });
            transaction.update(itemRef, { stock: increment(-consumedItem.quantityToConsume) });

            if (consumedItem.batchData?.locationId) {
                const tankRef = doc(db, TANKS_COLLECTION, consumedItem.batchData.locationId);
                const tankDoc = docsMap.get(`tank/${consumedItem.batchData.locationId}`);

                if (tankDoc && tankDoc.exists()) {
                    const tankData = tankDoc.data();
                    const newTankQuantity = (tankData.currentQuantity || 0) - consumedItem.quantityToConsume;
                    
                    if (newTankQuantity <= 0.001) {
                        transaction.update(tankRef, { status: 'Libre', currentBatchId: null, currentQuantity: 0, updatedAt: Timestamp.now() });
                    } else {
                        transaction.update(tankRef, { currentQuantity: newTankQuantity, updatedAt: Timestamp.now() });
                    }
                }
            }

            await addStockTxnFSTransactional(transaction, {
                inventoryItemId: consumedItem.componentId, batchId: consumedItem.batchId, qtyDelta: -consumedItem.quantityToConsume,
                newStock: (itemDoc.data()!.stock || 0) - consumedItem.quantityToConsume, unitCost: consumedItem.unitCost,
                refCollection: 'productionRuns', refId: runId, txnType: 'consumo',
                notes: `Consumo para OP ${runData.opCode}`
            });
        }
        
        if (runData.type === 'blend' && runData.tankId) {
            const tankRef = doc(db, TANKS_COLLECTION, runData.tankId);
            transaction.update(tankRef, { status: 'Ocupado', updatedAt: Timestamp.now() });
        }

        const newCleaningLog: CleaningLog = {
            date: new Date().toISOString(),
            type: 'initial' as const,
            userId: userId,
            runId: runId,
            material: 'N/A'
        };

        transaction.update(runRef, {
            status: 'En curso',
            startActual: new Date().toISOString(),
            consumedComponents: consumedComponentsLog,
            cleaningLogs: arrayUnion(newCleaningLog),
            updatedAt: new Date().toISOString()
        });
    });
};


export const pauseProductionRunFS = async (runId: string): Promise<void> => {
    const runRef = doc(db, PRODUCTION_RUNS_COLLECTION, runId);
    await updateDoc(runRef, {
        status: 'Pausada',
        lastPausedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
};

export const resumeProductionRunFS = async (runId: string): Promise<void> => {
    const runRef = doc(db, PRODUCTION_RUNS_COLLECTION, runId);
    await runTransaction(db, async (transaction) => {
        const runDoc = await transaction.get(runRef);
        if (!runDoc.exists()) throw new Error("Orden de producción no encontrada.");
        const runData = fromFirestoreProductionRun(runDoc);
        if (runData.status !== 'Pausada') throw new Error("La orden no está pausada.");

        let totalPauseMs = runData.totalPauseDuration || 0;
        if (runData.lastPausedAt) {
            totalPauseMs += differenceInMilliseconds(new Date(), parseISO(runData.lastPausedAt));
        }

        transaction.update(runRef, {
            status: 'En curso',
            totalPauseDuration: totalPauseMs,
            lastPausedAt: null, // Clear pause timestamp
            updatedAt: new Date().toISOString()
        });
    });
};

export const closeProductionRunFS = async (runId: string, data: FinishProductionRunFormValues, userId: string): Promise<void> => {
    const runRef = doc(db, PRODUCTION_RUNS_COLLECTION, runId);
    
    // Perform non-transactional reads first to get necessary IDs
    const initialRunDoc = await getDoc(runRef);
    if (!initialRunDoc.exists()) throw new Error("Orden de producción no encontrada.");
    const runData = fromFirestoreProductionRun(initialRunDoc);
    
    const productQuery = query(collection(db, INVENTORY_ITEMS_COLLECTION), where('sku', '==', runData.productSku), limit(1));
    const productSnapshot = await getDocs(productQuery);
    if (productSnapshot.empty) throw new Error(`Producto de salida con SKU ${runData.productSku} no encontrado.`);
    const productItemRef = productSnapshot.docs[0].ref;

    return runTransaction(db, async (transaction) => {
        // --- 1. TRANSACTIONAL READS ---
        const runDoc = await transaction.get(runRef); // Re-read inside transaction
        const productDoc = await transaction.get(productItemRef);

        if (!runDoc.exists()) throw new Error("La orden de producción fue eliminada durante el proceso.");
        if (!productDoc.exists()) throw new Error("El producto de salida fue eliminado durante el proceso.");
        
        const currentRunData = fromFirestoreProductionRun(runDoc);
        if (currentRunData.status !== 'En curso' && currentRunData.status !== 'Pausada') {
            throw new Error(`La orden no está en un estado válido para ser finalizada (estado actual: ${currentRunData.status}).`);
        }
        
        const productData = { id: productDoc.id, ...productDoc.data() } as InventoryItem;

        // --- 2. CALCULATIONS ---
        const { qtyActual, notesProd, cleaningConfirmed, cleaningMaterial } = data;
        const totalCost = (currentRunData.consumedComponents || []).reduce((sum, comp) => sum + ((comp.unitCost || 0) * comp.quantity), 0);
        const unitCost = qtyActual > 0 ? totalCost / qtyActual : 0;
        const yieldPct = currentRunData.qtyPlanned > 0 ? (qtyActual / currentRunData.qtyPlanned) * 100 : 0;
        const endActual = new Date();
        const startActual = currentRunData.startActual ? parseISO(currentRunData.startActual) : endActual;
        const durationMs = differenceInMilliseconds(endActual, startActual) - (currentRunData.totalPauseDuration || 0);
        const durationHours = durationMs > 0 ? durationMs / (1000 * 60 * 60) : 0;
        const bottlesPerHour = durationHours > 0 && currentRunData.type === 'fill' ? qtyActual / durationHours : 0;

        // --- 3. WRITES ---
        const lineAsNumber = parseInt((currentRunData.lineId || '1').replace(/[^0-9]/g, ''), 10) || 1;
        const { batchId, internalBatchCode } = await createFinishedGoodBatchFSTransactional(transaction, productData, {
            productionRunId: runId, 
            line: lineAsNumber, 
            quantity: qtyActual, 
            unitCost,
            locationId: currentRunData.type === 'blend' ? currentRunData.tankId : undefined,
        });

        const newStock = (productData.stock || 0) + qtyActual;
        transaction.update(productItemRef, { stock: increment(qtyActual) });

        await addStockTxnFSTransactional(transaction, {
            inventoryItemId: productData.id, batchId: batchId, qtyDelta: qtyActual, newStock, unitCost,
            refCollection: 'productionRuns', refId: runId, txnType: 'produccion', notes: `Producción de OP ${currentRunData.opCode}`
        });
        
        await addProductCostSnapshotFSTransactional(transaction, {
            productionRunId: runId, productSku: currentRunData.productSku, unitCost,
        });

        if (currentRunData.type === 'blend' && currentRunData.tankId) {
            const tankRef = doc(db, TANKS_COLLECTION, currentRunData.tankId);
            transaction.update(tankRef, { 
                status: 'Ocupado', 
                updatedAt: Timestamp.now(), 
                currentBatchId: internalBatchCode,
                currentQuantity: qtyActual,
                currentUom: productData.uom
            });
        }
        
        const updatePayload: any = {
            status: 'Finalizada', qtyActual, endActual: endActual.toISOString(),
            yieldPct, bottlesPerHour: bottlesPerHour || null,
            cost: { total: totalCost, unit: unitCost }, 
            outputBatchId: internalBatchCode,
            notesProd: notesProd || null, updatedAt: endActual.toISOString(),
        };

        if (cleaningConfirmed && cleaningMaterial) {
            const finalCleaningLog: CleaningLog = {
                date: endActual.toISOString(),
                type: 'final',
                userId: userId,
                runId: runId,
                material: cleaningMaterial,
            };
            updatePayload.cleaningLogs = arrayUnion(finalCleaningLog);
        }

        transaction.update(runRef, updatePayload);
    });
};
