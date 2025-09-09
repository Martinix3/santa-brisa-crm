
import { adminDb } from '@/lib/firebaseAdmin';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot, runTransaction, FieldValue, increment, where
} from "firebase-admin/firestore";
import type { DirectSale, ItemBatch, InventoryItem, DirectSaleItem } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { addStockTxnFSTransactional } from './stock-txn-service';
import { generateDirectSaleCode } from '@/lib/coding';
import { fromFirestoreDirectSale, toFirestoreDirectSale } from './utils/firestore-converters';
import type { TipoPedido } from "@ssot";

const DIRECT_SALES_COLLECTION = 'directSales'; 

export const getDirectSalesFS = async (): Promise<DirectSale[]> => {
  const salesCol = adminDb.collection(DIRECT_SALES_COLLECTION);
  const q = salesCol.orderBy('issueDate', 'desc');
  const salesSnapshot = await q.get();
  return salesSnapshot.docs.map(docSnap => fromFirestoreDirectSale(docSnap));
};

export const addDirectSaleFS = async (data: any): Promise<string> => {
  const saleCode = await generateDirectSaleCode();
  const newSaleDocRef = doc(adminDb, DIRECT_SALES_COLLECTION, saleCode);

  return await runTransaction(adminDb, async (transaction) => {
    let totalCostOfGoods = 0;

    const { subtotal, tax, totalAmount } = data; // Use client-calculated totals

    const itemRefs = data.items.map((item: any) => doc(adminDb, 'inventoryItems', item.productId));
    const batchRefs = data.items.map((item: any) => item.batchId ? doc(adminDb, 'itemBatches', item.batchId) : null).filter(Boolean);
    
    const allRefs = [...itemRefs, ...batchRefs];
    const allDocs = await Promise.all(allRefs.map(ref => transaction.get(ref!)));
    
    const itemDocsMap = new Map(allDocs.slice(0, data.items.length).map(d => [d.id, d]));
    const batchDocsMap = new Map(allDocs.slice(data.items.length).map(d => [d.id, d]));

    if (data.type === 'directa') {
        for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];
            if (!item.batchId) throw new Error(`El artículo ${item.productName} debe tener un lote seleccionado para una venta directa.`);
            
            const itemDoc = itemDocsMap.get(item.productId);
            const batchDoc = batchDocsMap.get(item.batchId);

            if (!itemDoc?.exists()) throw new Error(`Producto ${item.productName} no encontrado.`);
            if (!batchDoc?.exists()) throw new Error(`Lote para ${item.productName} no encontrado.`);
            
            const itemData = itemDoc.data() as InventoryItem;
            const batchData = batchDoc.data() as ItemBatch;
            
            if (batchData.qtyRemaining < item.quantity) {
                throw new Error(`Stock insuficiente para ${item.productName} (Lote ${batchData.internalBatchCode}). Disponible: ${batchData.qtyRemaining}, Solicitado: ${item.quantity}`);
            }

            const newBatchQty = batchData.qtyRemaining - item.quantity;
            totalCostOfGoods += (batchData.unitCost || 0) * item.quantity;

            transaction.update(doc(adminDb, 'itemBatches', item.batchId), {
                qtyRemaining: newBatchQty,
                isClosed: newBatchQty <= 0
            });
            transaction.update(doc(adminDb, 'inventoryItems', item.productId), {
                stock: increment(-item.quantity)
            });

            await addStockTxnFSTransactional(transaction, {
                inventoryItemId: item.productId,
                batchId: item.batchId,
                qtyDelta: -item.quantity,
                newStock: (itemData.stock || 0) - item.quantity,
                unitCost: batchData.unitCost,
                refCollection: 'directSales',
                refId: newSaleDocRef.id,
                txnType: 'venta',
                notes: `Venta Directa a ${data.customerName}`
            });
        }
    } else { // 'deposito'
        for (let i = 0; i < data.items.length; i++) {
             const item = data.items[i];
             const itemRef = doc(adminDb, 'inventoryItems', item.productId);
             const itemDoc = itemDocsMap.get(item.productId);
             if (!itemDoc?.exists()) throw new Error(`Producto ${item.productName} no encontrado.`);

             transaction.update(itemRef, { stock: increment(-item.quantity) });
              await addStockTxnFSTransactional(transaction, {
                inventoryItemId: item.productId,
                batchId: item.batchId,
                qtyDelta: -item.quantity,
                newStock: (itemDoc.data()!.stock || 0) - item.quantity, 
                unitCost: item.netUnitPrice, 
                refCollection: 'directSales',
                refId: newSaleDocRef.id,
                txnType: 'ajuste',
                notes: `Envío en depósito a ${data.customerName}`
            });
        }
    }
    
    const firestoreData = toFirestoreDirectSale({ ...data, subtotal, tax, totalAmount }, true);
    firestoreData.costOfGoods = totalCostOfGoods;
    firestoreData.status = data.type === 'deposito' ? 'en depósito' : (data.status || 'borrador');
    transaction.set(newSaleDocRef, firestoreData);
    
    return newSaleDocRef.id;
  });
};

export const regularizeConsignmentDirectSaleFS = async (originalSaleId: string, unitsToInvoice: number): Promise<void> => {
  return await runTransaction(adminDb, async (transaction) => {
    const originalSaleRef = doc(adminDb, DIRECT_SALES_COLLECTION, originalSaleId);
    const originalSaleDoc = await transaction.get(originalSaleRef);
    if (!originalSaleDoc.exists()) throw new Error("La orden de depósito original no existe.");
    
    const originalSaleData = originalSaleDoc.data() as DirectSale;
    if (originalSaleData.type !== 'deposito' || originalSaleData.status !== 'en depósito') {
      throw new Error("Esta orden no es una venta en depósito válida para regularizar.");
    }
    
    const originalItem = originalSaleData.items[0];
    if (!originalItem) throw new Error("La orden de depósito no tiene artículos.");

    const qtyInConsignment = originalSaleData.qtyRemainingInConsignment?.[originalItem.productId] ?? originalItem.quantity;
    if (unitsToInvoice > qtyInConsignment) {
      throw new Error(`No se pueden facturar ${unitsToInvoice} unidades. Solo quedan ${qtyInConsignment} en depósito.`);
    }

    const newSaleCode = await generateDirectSaleCode();
    const newSaleRef = doc(adminDb, DIRECT_SALES_COLLECTION, newSaleCode);

    const pricePerUnit = 8;
    const subtotal = unitsToInvoice * pricePerUnit;
    const tax = subtotal * 0.21;
    const totalAmount = subtotal + tax;

    const newInvoiceItem: DirectSaleItem = {
      ...originalItem,
      quantity: unitsToInvoice,
      total: subtotal,
      netUnitPrice: pricePerUnit
    };
    
    const newInvoiceData: Omit<DirectSale, 'id'> = {
        ...originalSaleData,
        type: 'directa',
        status: 'facturado',
        items: [newInvoiceItem],
        subtotal,
        tax,
        totalAmount,
        issueDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        invoiceNumber: newSaleCode,
        relatedPlacementOrders: [originalSaleId],
        notes: `Factura de regularización de depósito para orden ${originalSaleId}.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        originalConsignmentId: originalSaleId,
        costOfGoods: pricePerUnit * unitsToInvoice,
        qtyRemainingInConsignment: {},
    };

    transaction.set(newSaleRef, newInvoiceData);

    const newRemainingQty = qtyInConsignment - unitsToInvoice;
    const updatedQtyRemainingMap = {
      ...originalSaleData.qtyRemainingInConsignment,
      [originalItem.productId]: newRemainingQty
    };
    
    transaction.update(originalSaleRef, {
      qtyRemainingInConsignment: updatedQtyRemainingMap,
      updatedAt: Timestamp.now()
    });
  });
};

export const updateDirectSaleFS = async (id: string, data: Partial<any>): Promise<void> => {
  const saleDocRef = doc(adminDb, DIRECT_SALES_COLLECTION, id);
  const firestoreData = toFirestoreDirectSale(data, false);
  await updateDoc(saleDocRef, firestoreData);
};

export const deleteDirectSaleFS = async (id: string): Promise<void> => {
    return await runTransaction(adminDb, async (transaction) => {
        const saleRef = doc(adminDb, DIRECT_SALES_COLLECTION, id);
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists()) throw new Error("El pedido que intentas eliminar no existe o ya ha sido eliminado.");

        const saleData = saleDoc.data() as DirectSale;
        
        // --- READ PHASE ---
        const itemRefsToRead: DocumentReference[] = [];
        if (saleData.type === 'directa' || saleData.type === 'deposito') {
            for (const item of saleData.items) {
                if(item.productId) itemRefsToRead.push(doc(adminDb, 'inventoryItems', item.productId));
            }
        }
        const itemDocs = await Promise.all(itemRefsToRead.map(ref => ref ? transaction.get(ref) : Promise.resolve(null)));
        const itemDocsMap = new Map(itemDocs.map(doc => doc ? [doc.id, doc] : [null, null]).filter(entry => entry[0]));
        // --- END READ PHASE ---
        
        if (saleData.type === 'directa') {
            for (const item of saleData.items) {
                if (!item.batchId || !item.productId) continue;

                const itemDoc = itemDocsMap.get(item.productId);
                
                // Only update stock if the item exists
                if (itemDoc && itemDoc.exists()) {
                    transaction.update(itemDoc.ref, { stock: increment(item.quantity) });
                } else {
                    console.warn(`Item with ID ${item.productId} not found. Skipping stock reversal for this item.`);
                }

                const batchRef = doc(adminDb, 'itemBatches', item.batchId);
                transaction.update(batchRef, { qtyRemaining: increment(item.quantity), isClosed: false });

                await addStockTxnFSTransactional(transaction, {
                    inventoryItemId: item.productId, batchId: item.batchId,
                    qtyDelta: item.quantity, newStock: -1, // Placeholder, new stock is not accurately available here
                    unitCost: item.netUnitPrice / 1.21, refCollection: 'directSales', refId: id,
                    txnType: 'ajuste', notes: `Anulación de venta directa ${id}`
                });
            }
        } else if (saleData.type === 'deposito') {
            for (const item of saleData.items) {
                 if (!item.productId) continue;
                 const itemDoc = itemDocsMap.get(item.productId);
                 if (itemDoc && itemDoc.exists()) {
                    transaction.update(itemDoc.ref, { stock: increment(item.quantity) });
                 } else {
                     console.warn(`Item with ID ${item.productId} not found. Skipping stock reversal for this consignment item.`);
                 }
            }
        }
        transaction.delete(saleRef);
    });
};
