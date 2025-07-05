
'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot, runTransaction
} from "firebase/firestore";
import type { DirectSale, ItemBatch, InventoryItem } from '@/types';
import type { DirectSaleWizardFormValues } from '@/lib/schemas/direct-sale-schema';
import { format, parseISO, isValid } from 'date-fns';
import { addStockTxnFSTransactional } from './stock-txn-service';

const DIRECT_SALES_COLLECTION = 'directSales';

type DirectSaleWithExtras = DirectSaleWizardFormValues & { issueDate: Date; customerId?: string };


const fromFirestoreDirectSale = (docSnap: DocumentSnapshot): DirectSale => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    customerId: data.customerId || '',
    customerName: data.customerName || '',
    channel: data.channel || 'Otro',
    items: data.items || [],
    subtotal: data.subtotal || 0,
    tax: data.tax || 0,
    totalAmount: data.totalAmount || 0,
    issueDate: data.issueDate instanceof Timestamp ? format(data.issueDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    dueDate: data.dueDate instanceof Timestamp ? format(data.dueDate.toDate(), "yyyy-MM-dd") : undefined,
    invoiceNumber: data.invoiceNumber || undefined,
    status: data.status || 'Borrador',
    relatedPlacementOrders: data.relatedPlacementOrders || [],
    notes: data.notes || undefined,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  };
};

const toFirestoreDirectSale = (data: Partial<DirectSaleWithExtras>, isNew: boolean): any => {
  const subtotal = data.items?.reduce((sum, item) => sum + (item.quantity || 0) * (item.netUnitPrice || 0), 0) || 0;
  const tax = subtotal * 0.21;
  const totalAmount = subtotal + tax;

  const firestoreData: { [key: string]: any } = {
      customerId: data.customerId || null,
      customerName: data.customerName,
      channel: data.channel,
      items: data.items?.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          netUnitPrice: item.netUnitPrice,
          total: (item.quantity || 0) * (item.netUnitPrice || 0),
          batchId: item.batchId,
          batchNumber: item.batchNumber || null
      })) || [],
      subtotal,
      tax,
      totalAmount,
      status: data.status,
      invoiceNumber: data.invoiceNumber || null,
      relatedPlacementOrders: data.relatedPlacementOrders ? data.relatedPlacementOrders.split(',').map(s => s.trim()) : [],
      notes: data.notes || null,
  };

  if (data.issueDate && isValid(data.issueDate)) {
    firestoreData.issueDate = Timestamp.fromDate(data.issueDate);
  } else {
    firestoreData.issueDate = Timestamp.fromDate(new Date());
  }

  if (data.dueDate && isValid(data.dueDate)) {
    firestoreData.dueDate = Timestamp.fromDate(data.dueDate);
  } else {
    firestoreData.dueDate = null;
  }

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());
  
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      firestoreData[key] = null;
    }
  });

  return firestoreData;
};


export const getDirectSalesFS = async (): Promise<DirectSale[]> => {
  const salesCol = collection(db, DIRECT_SALES_COLLECTION);
  const q = query(salesCol, orderBy('issueDate', 'desc'));
  const salesSnapshot = await getDocs(q);
  return salesSnapshot.docs.map(docSnap => fromFirestoreDirectSale(docSnap));
};


export const addDirectSaleFS = async (data: DirectSaleWithExtras): Promise<string> => {
  const newSaleDocRef = doc(collection(db, DIRECT_SALES_COLLECTION));

  return await runTransaction(db, async (transaction) => {
    // 1. Get all refs and do all reads first
    const itemRefs = data.items.map(item => doc(db, 'inventoryItems', item.productId));
    const batchRefs = data.items.map(item => doc(db, 'itemBatches', item.batchId));
    
    const allRefs = [...itemRefs, ...batchRefs];
    const allDocs = await Promise.all(allRefs.map(ref => transaction.get(ref)));
    
    const itemDocs = allDocs.slice(0, data.items.length);
    const batchDocs = allDocs.slice(data.items.length);

    // 2. Validate and prepare writes
    for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const itemDoc = itemDocs[i];
        const batchDoc = batchDocs[i];

        if (!itemDoc.exists()) throw new Error(`Producto ${item.productName} no encontrado.`);
        if (!batchDoc.exists()) throw new Error(`Lote para ${item.productName} no encontrado.`);
        
        const itemData = itemDoc.data() as InventoryItem;
        const batchData = batchDoc.data() as ItemBatch;
        
        if (batchData.qtyRemaining < item.quantity) {
            throw new Error(`Stock insuficiente para ${item.productName} (Lote ${batchData.internalBatchCode}). Disponible: ${batchData.qtyRemaining}, Solicitado: ${item.quantity}`);
        }

        const newBatchQty = batchData.qtyRemaining - item.quantity;
        const newItemQty = (itemData.stock || 0) - item.quantity;

        // Queue updates
        transaction.update(batchRefs[i], {
            qtyRemaining: newBatchQty,
            isClosed: newBatchQty <= 0
        });
        transaction.update(itemRefs[i], {
            stock: newItemQty
        });

        await addStockTxnFSTransactional(transaction, {
            inventoryItemId: item.productId,
            batchId: item.batchId,
            qtyDelta: -item.quantity,
            newStock: newItemQty,
            unitCost: batchData.unitCost,
            refCollection: 'directSales',
            refId: newSaleDocRef.id,
            txnType: 'venta',
            notes: `Venta Directa a ${data.customerName}`
        });
    }
    
    // Final write: create the sale document
    const firestoreData = toFirestoreDirectSale(data, true);
    transaction.set(newSaleDocRef, firestoreData);
    
    return newSaleDocRef.id;
  });
};

export const updateDirectSaleFS = async (id: string, data: Partial<DirectSaleWithExtras>): Promise<void> => {
  const saleDocRef = doc(db, DIRECT_SALES_COLLECTION, id);
  const firestoreData = toFirestoreDirectSale(data, false);
  await updateDoc(saleDocRef, firestoreData);
};

export const deleteDirectSaleFS = async (id: string): Promise<void> => {
  // Note: Deleting a sale does not automatically revert stock. This should be handled by a separate "return" or "adjustment" process.
  const saleDocRef = doc(db, DIRECT_SALES_COLLECTION, id);
  await deleteDoc(saleDocRef);
};


export const initializeMockDirectSalesInFirestore = async (mockData: DirectSale[]) => {
    const salesCol = collection(db, DIRECT_SALES_COLLECTION);
    const snapshot = await getDocs(query(salesCol));
    if (snapshot.empty && mockData.length > 0) {
        for(const sale of mockData) {
            const { id, createdAt, updatedAt, issueDate, dueDate, ...saleData } = sale;
            
            const firestoreReadyData: any = { ...saleData };
            firestoreReadyData.issueDate = issueDate ? Timestamp.fromDate(parseISO(issueDate)) : Timestamp.fromDate(new Date());
            firestoreReadyData.dueDate = dueDate ? Timestamp.fromDate(parseISO(dueDate)) : null;
            firestoreReadyData.createdAt = createdAt ? Timestamp.fromDate(parseISO(createdAt)) : Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? Timestamp.fromDate(parseISO(updatedAt)) : Timestamp.fromDate(new Date());
            
            await addDoc(salesCol, firestoreReadyData);
        }
        console.log('Mock direct sales initialized in Firestore.');
    }
};
