import { adminDb } from '@/lib/firebaseAdmin';
import { collection, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction, getDoc, query, where, getDocs, type DocumentSnapshot, writeBatch, increment, FieldValue } from "firebase-admin/firestore";
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

export const getPurchasesFS = async (supplierId?: string): Promise<Expense[]> => {
    let q: FirebaseFirestore.Query = adminDb.collection(EXPENSES_COLLECTION);
    if (supplierId) {
        q = q.where('proveedorId', '==', supplierId);
    }
    q = q.orderBy('fechaCreacion', 'desc');
    const snapshot = await q.get();
    return snapshot.docs.map(fromFirestoreExpense);
}

async function getOrCreateSupplier(transaction: FirebaseFirestore.Transaction, data: PurchaseFormValues): Promise<{ id: string; name: string, code: string } | null> {
    const suppliersRef = adminDb.collection(SUPPLIERS_COLLECTION);

    if (data.proveedorId && data.proveedorId !== '##NEW##') {
        const supplierDoc = await transaction.get(suppliersRef.doc(data.proveedorId));
        if (supplierDoc.exists) {
            const supplierData = supplierDoc.data() as Supplier;
            return { id: supplierDoc.id, name: supplierData.name, code: supplierData.code || 'NA' };
        }
    }

    if (data.proveedorNombre) {
        const q = suppliersRef.where("name", "==", data.proveedorNombre);
        const existingSnap = await q.get(); 
        if (!existingSnap.empty) {
            const supplierData = existingSnap.docs[0].data() as Supplier;
            return { id: existingSnap.docs[0].id, name: supplierData.name, code: supplierData.code || 'NA' };
        }
        
        const code = (data.proveedorNombre || "NUEVO").substring(0, 3).toUpperCase();
        const newSupplierRef = suppliersRef.doc();
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
        const itemRef = adminDb.collection(INVENTORY_ITEMS_COLLECTION).doc(itemData.productoId);
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) {
            throw new Error(`El artículo con ID ${itemData.productoId} no fue encontrado.`);
        }
        return { id: itemData.productoId, isNew: false, data: { id: itemDoc.id, ...itemDoc.data() } as InventoryItem };
    }

    if (!itemData.newItemName) throw new Error("Se intentó crear un artículo sin nombre.");

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
  await runTransaction(adminDb, async (transaction) => {
    const supplierInfo = await getOrCreateSupplier(transaction, data);
    const categoryDocRef = adminDb.collection(CATEGORIES_COLLECTION).doc(data.categoriaId!);
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
    const newExpenseRef = adminDb.collection(EXPENSES_COLLECTION).doc();

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

        const itemRef = adminDb.collection(INVENTORY_ITEMS_COLLECTION).doc(itemId);
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
    const expenseRef = adminDb.collection(EXPENSES_COLLECTION).doc(id);
    const payload = toFirestoreExpense(data, false, ''); 
    await updateDoc(expenseRef, payload);
};

export const deleteExpenseFS = async (id: string): Promise<void> => {
  const docRef = adminDb.collection(EXPENSES_COLLECTION).doc(id);
  await deleteDoc(docRef);
};

export const deleteExpensesBatchFS = async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    const batch = writeBatch(adminDb);
    ids.forEach(id => {
        const docRef = adminDb.collection(EXPENSES_COLLECTION).doc(id);
        batch.delete(docRef);
    });
    await batch.commit();
};
