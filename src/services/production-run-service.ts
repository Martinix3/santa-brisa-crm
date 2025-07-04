
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, where, limit } from "firebase/firestore";
import type { ProductionRun, ProductionRunFormValues, InventoryItem, BomLine, StockTxn } from '@/types';
import { format } from 'date-fns';
import { fromFirestoreBomLine } from './utils/firestore-converters';
import { addStockTxnFSTransactional } from './stock-txn-service';
import { addProductCostSnapshotFSTransactional } from './product-cost-snapshot-service';


const PRODUCTION_RUNS_COLLECTION = 'productionRuns';
const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';
const BOM_LINES_COLLECTION = 'bomLines';

const fromFirestore = (snapshot: any): ProductionRun => {
  const data = snapshot.data();
  if (!data) throw new Error("Production run data is undefined.");
  return {
    id: snapshot.id,
    productSku: data.productSku,
    productName: data.productName,
    qtyPlanned: data.qtyPlanned,
    qtyProduced: data.qtyProduced,
    status: data.status,
    startDate: data.startDate instanceof Timestamp ? format(data.startDate.toDate(), "yyyy-MM-dd") : new Date().toISOString(),
    endDate: data.endDate instanceof Timestamp ? format(data.endDate.toDate(), "yyyy-MM-dd") : undefined,
    unitCost: data.unitCost,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : undefined,
  };
};

const toFirestore = (data: ProductionRunFormValues, isNew: boolean): any => {
  const firestoreData = { ...data };
  if (isNew) {
    firestoreData.createdAt = Timestamp.now();
    firestoreData.status = 'Borrador';
    firestoreData.startDate = Timestamp.now();
  }
  firestoreData.updatedAt = Timestamp.now();
  return firestoreData;
};

export const getProductionRunsFS = async (): Promise<ProductionRun[]> => {
  const q = query(collection(db, PRODUCTION_RUNS_COLLECTION), orderBy('startDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(fromFirestore);
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
    // 1. Get Production Run & BOM outside the transaction
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

    // Get finished good ref outside transaction
    const finishedGoodQuery = query(collection(db, INVENTORY_ITEMS_COLLECTION), where('sku', '==', runData.productSku), limit(1));
    const finishedGoodSnapshot = await getDocs(finishedGoodQuery);
    if (finishedGoodSnapshot.empty) {
        throw new Error(`El producto a fabricar con SKU ${runData.productSku} no se encuentra en el inventario.`);
    }
    const finishedGoodRef = finishedGoodSnapshot.docs[0].ref;

    return runTransaction(db, async (transaction) => {
        // Re-read runDoc inside transaction for consistency check
        const freshRunDoc = await transaction.get(runRef);
        if (!freshRunDoc.exists() || freshRunDoc.data().status !== runData.status) {
             throw new Error("El estado de la orden de producción ha cambiado. Por favor, inténtelo de nuevo.");
        }

        // 2. Process Component Consumption
        let totalConsumedCost = 0;
        for (const line of bomLines) {
            const componentRef = doc(db, INVENTORY_ITEMS_COLLECTION, line.componentId);
            const componentDoc = await transaction.get(componentRef); // Read inside transaction
            if (!componentDoc.exists()) throw new Error(`El componente con ID ${line.componentId} no fue encontrado.`);
            
            const componentData = componentDoc.data() as InventoryItem;
            const consumedQty = line.quantity * qtyProduced;

            if ((componentData.stock || 0) < consumedQty) {
                throw new Error(`Stock insuficiente para el componente ${componentData.name}. Requerido: ${consumedQty}, Disponible: ${componentData.stock}`);
            }

            const newStock = (componentData.stock || 0) - consumedQty;
            transaction.update(componentRef, { stock: newStock });
            
            const unitCost = componentData.latestPurchase?.calculatedUnitCost || 0;
            if(unitCost === 0) {
                console.warn(`El componente ${componentData.name} no tiene un coste definido. No se añadirá al coste total de producción.`);
            }
            totalConsumedCost += unitCost * consumedQty;
            
            await addStockTxnFSTransactional(transaction, { 
                inventoryItemId: line.componentId,
                qtyDelta: -consumedQty,
                newStock: newStock,
                unitCost: unitCost,
                refCollection: 'productionRuns',
                refId: runId,
                txnType: 'consumo',
                notes: `Consumo para producción de ${runData.productName}`
            });
        }

        // 3. Process Finished Good Production
        const freshFinishedGoodDoc = await transaction.get(finishedGoodRef); 
        if (!freshFinishedGoodDoc.exists()) {
             throw new Error(`El producto a fabricar con SKU ${runData.productSku} no se encuentra en el inventario (fallo en transacción).`);
        }
        const finishedGoodData = freshFinishedGoodDoc.data() as InventoryItem;
        const newFinishedStock = (finishedGoodData.stock || 0) + qtyProduced;
        const newUnitCost = qtyProduced > 0 ? totalConsumedCost / qtyProduced : 0;

        transaction.update(finishedGoodRef, {
            stock: newFinishedStock,
            latestPurchase: {
                ...(finishedGoodData.latestPurchase || {}),
                calculatedUnitCost: newUnitCost,
                purchaseDate: format(new Date(), 'yyyy-MM-dd'),
            }
        });
        await addStockTxnFSTransactional(transaction, {
            inventoryItemId: finishedGoodRef.id,
            qtyDelta: qtyProduced,
            newStock: newFinishedStock,
            unitCost: newUnitCost,
            refCollection: 'productionRuns',
            refId: runId,
            txnType: 'produccion',
            notes: `Producción de ${runData.productName}`
        });

        // 4. Update Production Run & Create Snapshot
        transaction.update(runRef, {
            status: 'Finalizada',
            qtyProduced: qtyProduced,
            unitCost: newUnitCost,
            endDate: Timestamp.now(),
        });

        await addProductCostSnapshotFSTransactional(transaction, {
            inventoryItemId: finishedGoodRef.id,
            unitCost: newUnitCost,
            productionRunId: runId
        });

        return { success: true, newUnitCost: newUnitCost };
    });
};
