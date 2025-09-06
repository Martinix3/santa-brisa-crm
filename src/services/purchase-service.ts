import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, getDoc, query, where, getDocs, type DocumentSnapshot, writeBatch, increment, FieldValue } from "firebase/firestore";
import type { Expense, Category, InventoryItem, Supplier } from '@/types';
import { fromFirestoreExpense, toFirestoreExpense } from './utils/firestore-converters';
import { addStockTxnFSTransactional } from './stock-txn-service';
import { createRawMaterialBatchFSTransactional } from './batch-service';
import type { PurchaseFormValues } from '@/lib/schemas/purchase-schema';
import { addInventoryItemFS } from './inventory-item-service';

const EXPENSES_COLLECTION = 'purchases';
const SUPPLIERS_COLLECTION = 'suppliers';
const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';
const CATEGORIES_COLLECTION = 'categories';

export const getExpensesFS = async (): Promise<Expense[]> => {
    const expensesCol = collection(db, EXPENSES_COLLECTION);
    const q = query(expensesCol, orderBy('fechaCreacion', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(fromFirestoreExpense);
};

export const getPurchasesFS = async (supplierId: string): Promise<Expense[]> => {
    const expensesCol = collection(db, EXPENSES_COLLECTION);
    const q = query(expensesCol, where('proveedorId', '==', supplierId), orderBy('fechaCreacion', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(fromFirestoreExpense);
}

async function getOrCreateSupplier(transaction: FirebaseFirestore.Transaction, data: PurchaseFormValues): Promise<{ id: string; name: string, code: string } | null> {
    const suppliersRef = collection(db, SUPPLIERS_COLLECTION);

    // If an ID is provided, try to get it.
    if (data.proveedorId && data.proveedorId !== '##NEW##') {
        const supplierDoc = await transaction.get(doc(suppliersRef, data.proveedorId));
        if (supplierDoc.exists()) {
            const supplierData = supplierDoc.data() as Supplier;
            return { id: supplierDoc.id, name: supplierData.name, code: supplierData.code || 'NA' };
        }
    }

    // If no ID or ID not found, check by name (case-insensitive) or CIF
    if (data.proveedorNombre) {
        // Read outside of the transaction to avoid read-after-write errors if we create a new one.
        // This is a calculated risk; in a high-concurrency scenario, two users could create the same supplier.
        // For this CRM's use case, it's an acceptable tradeoff.
        const q = query(suppliersRef, where("name", "==", data.proveedorNombre));
        const existingSnap = await getDocs(q); 
        if (!existingSnap.empty) {
            const supplierData = existingSnap.docs[0].data() as Supplier;
            return { id: existingSnap.docs[0].id, name: supplierData.name, code: supplierData.code || 'NA' };
        }
        
        // If still not found, create it
        const code = (data.proveedorNombre || "NUEVO").substring(0, 3).toUpperCase();
        const newSupplierRef = doc(suppliersRef); // Create a new ref
        const newSupplierData = {
          name: data.proveedorNombre,
          cif: data.proveedorCif || null,
          code: code,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        transaction.set(newSupplierRef, newSupplierData);
        return { id: newSupplierRef.id, name: newSupplierData.name, code: newSupplierData.code };
    }
    return null;
}

async function ensureItem(
    transaction: FirebaseFirestore.Transaction,
    itemData: PurchaseFormValues['items'][0],
    categoryDoc: DocumentSnapshot
): Promise<{ id: string; isNew: boolean, data: InventoryItem }> {
    if (itemData.productoId && itemData.productoId !== '##NEW##') {
        const itemRef = doc(db, INVENTORY_ITEMS_COLLECTION, itemData.productoId);
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) {
            throw new Error(`El artículo con ID ${itemData.productoId} no fue encontrado.`);
        }
        return { id: itemData.productoId, isNew: false, data: { id: itemDoc.id, ...itemDoc.data() } as InventoryItem };
    }

    if (!itemData.newItemName) throw new Error("Se intentó crear un artículo sin nombre.");

    // This is now safe because addInventoryItemFS can be called inside a transaction
    const { id: newProductId, sku: newProductSku } = await addInventoryItemFS({
      name: itemData.newItemName,
      categoryId: categoryDoc.id,
      uom: 'unit'
    }, transaction);

    const newItemData: InventoryItem = {
      id: newProductId,
      name: itemData.newItemName,
      sku: newProductSku,
      categoryId: categoryDoc.id,
      uom: 'unit',
      stock: 0,
      createdAt: new Date().toISOString()
    };
    
    return { id: newProductId, isNew: true, data: newItemData };
}

export const addPurchaseFS = async (data: PurchaseFormValues, creatorId: string): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    // --- PHASE 1: READS ---
    const supplierInfo = await getOrCreateSupplier(transaction, data);
    const categoryDocRef = doc(db, CATEGORIES_COLLECTION, data.categoriaId!);
    const categoryDoc = await transaction.get(categoryDocRef);
    if (!categoryDoc.exists()) throw new Error(`Categoría con ID ${data.categoriaId} no encontrada.`);

    const itemsToProcess = data.isInventoryPurchase ? (data.items || []) : [];
    const itemDetailsPromises = itemsToProcess.map(itemData => {
      if (!itemData.cantidad || itemData.costeUnitario == null) {
        return Promise.resolve(null);
      }
      return ensureItem(transaction, itemData, categoryDoc);
    });

    const resolvedItemDetails = await Promise.all(itemDetailsPromises);

    // --- PHASE 2: WRITES ---
    const newExpenseRef = doc(collection(db, EXPENSES_COLLECTION));

    for (let i = 0; i < resolvedItemDetails.length; i++) {
        const detail = resolvedItemDetails[i];
        if (!detail) continue;

        const { id: itemId, data: itemForBatch } = detail;
        const itemData = itemsToProcess[i];

        const batchId = await createRawMaterialBatchFSTransactional(transaction, itemForBatch, {
            purchaseId: newExpenseRef.id,
            supplierId: supplierInfo?.id || 'N/A',
            supplierCode: supplierInfo?.code || 'NA',
            supplierBatchCode: itemData.proveedorLote || `MANUAL-${Date.now()}`,
            quantity: itemData.cantidad!,
            unitCost: itemData.costeUnitario!,
            expiryDate: itemData.caducidad,
        });

        const itemRef = doc(db, INVENTORY_ITEMS_COLLECTION, itemId);
        transaction.update(itemRef, { stock: increment(itemData.cantidad!) });

        await addStockTxnFSTransactional(transaction, {
            inventoryItemId: itemId,
            batchId,
            qtyDelta: itemData.cantidad!,
            newStock: (itemForBatch.stock || 0) + itemData.cantidad!,
            unitCost: itemData.costeUnitario!,
            refCollection: 'purchases',
            refId: newExpenseRef.id,
            txnType: 'recepcion',
        });
    }

    const payload = toFirestoreExpense({ ...data, proveedorId: supplierInfo?.id }, true, creatorId);
    transaction.set(newExpenseRef, payload);
  });
};


export const updatePurchaseFS = async (id: string, data: PurchaseFormValues): Promise<void> => {
    const expenseRef = doc(db, EXPENSES_COLLECTION, id);
    const payload = toFirestoreExpense(data, false, ''); 
    await updateDoc(expenseRef, payload);
};

export const deleteExpenseFS = async (id: string): Promise<void> => {
  const docRef = doc(db, EXPENSES_COLLECTION, id);
  await deleteDoc(docRef);
};

export const deleteExpensesBatchFS = async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    const batch = writeBatch(db);
    ids.forEach(id => {
        const docRef = doc(db, EXPENSES_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
};
