
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, where, limit, type DocumentSnapshot } from "firebase/firestore";
import type { ProductionRun, ProductionRunFormValues, InventoryItem, BomLine } from '@/types';
import { format } from 'date-fns';
import { fromFirestoreBomLine, fromFirestoreProductionRun } from './utils/firestore-converters';
import { addStockTxnFSTransactional } from './stock-txn-service';
import { addProductCostSnapshotFSTransactional } from './product-cost-snapshot-service';


const PRODUCTION_RUNS_COLLECTION = 'productionRuns';
const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';
const BOM_LINES_COLLECTION = 'bomLines';

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
    const runData = runDoc.data() as ProductionRun;
    
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

    return runTransaction(db, async (transaction) => {
        // --- STAGE 1: ALL READS ---
        const freshRunDoc = await transaction.get(runRef);
        if (!freshRunDoc.exists() || freshRunDoc.data().status !== runData.status) {
             throw new Error("El estado de la orden de producción ha cambiado. Por favor, inténtelo de nuevo.");
        }

        const freshFinishedGoodDoc = await transaction.get(finishedGoodRef); 
        if (!freshFinishedGoodDoc.exists()) {
             throw new Error(`El producto a fabricar con SKU ${runData.productSku} no se encuentra en el inventario (fallo en transacción).`);
        }
        const finishedGoodData = freshFinishedGoodDoc.data() as InventoryItem;

        const componentDocs = new Map<string, DocumentSnapshot>();
        const componentRefs = bomLines.map(line => doc(db, INVENTORY_ITEMS_COLLECTION, line.componentId));
        for(const ref of componentRefs) {
            const componentDoc = await transaction.get(ref);
            if (!componentDoc.exists()) throw new Error(`El componente con ID ${ref.id} no fue encontrado.`);
            componentDocs.set(ref.id, componentDoc);
        }

        // --- STAGE 2: LOGIC & PREPARING WRITES ---
        let totalConsumedCost = 0;
        const componentUpdates: { ref: any, data: any }[] = [];
        const stockTxnWrites: Promise<void>[] = [];
        const consumedComponentsSnapshot = [];

        for (const line of bomLines) {
            const componentDoc = componentDocs.get(line.componentId)!;
            const componentData = componentDoc.data() as InventoryItem;
            const consumedQty = line.quantity * qtyProduced;

            if ((componentData.stock || 0) < consumedQty) {
                throw new Error(`Stock insuficiente para el componente ${componentData.name}. Requerido: ${consumedQty}, Disponible: ${componentData.stock}`);
            }

            const newStock = (componentData.stock || 0) - consumedQty;
            componentUpdates.push({ ref: componentDoc.ref, data: { stock: newStock } });

            const unitCost = componentData.latestPurchase?.calculatedUnitCost || 0;
            if(unitCost === 0) {
                console.warn(`El componente ${componentData.name} no tiene un coste definido. No se añadirá al coste total de producción.`);
            }
            totalConsumedCost += unitCost * consumedQty;
            
            consumedComponentsSnapshot.push({
                componentId: line.componentId,
                componentName: componentData.name,
                componentSku: componentData.sku,
                consumedBatchNumber: componentData.latestPurchase?.batchNumber || 'N/A',
                quantity: consumedQty,
            });
            
            stockTxnWrites.push(addStockTxnFSTransactional(transaction, { 
                inventoryItemId: line.componentId,
                qtyDelta: -consumedQty,
                newStock: newStock,
                unitCost: unitCost,
                refCollection: 'productionRuns',
                refId: runId,
                txnType: 'consumo',
                notes: `Consumo para producción de ${runData.productName}`
            }));
        }

        const newFinishedStock = (finishedGoodData.stock || 0) + qtyProduced;
        const newUnitCost = qtyProduced > 0 ? totalConsumedCost / qtyProduced : 0;
        
        stockTxnWrites.push(addStockTxnFSTransactional(transaction, {
            inventoryItemId: finishedGoodRef.id,
            qtyDelta: qtyProduced,
            newStock: newFinishedStock,
            unitCost: newUnitCost,
            refCollection: 'productionRuns',
            refId: runId,
            txnType: 'produccion',
            notes: `Producción de ${runData.productName}`
        }));
        
        const productCostSnapshotWrite = addProductCostSnapshotFSTransactional(transaction, {
            inventoryItemId: finishedGoodRef.id,
            unitCost: newUnitCost,
            productionRunId: runId
        });

        // --- STAGE 3: ALL WRITES ---
        componentUpdates.forEach(update => {
            transaction.update(update.ref, update.data);
        });

        await Promise.all(stockTxnWrites);
        await productCostSnapshotWrite;

        transaction.update(finishedGoodRef, {
            stock: newFinishedStock,
            latestPurchase: {
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
            consumedComponents: consumedComponentsSnapshot
        });

        return { success: true, newUnitCost: newUnitCost };
    });
};
