
'use server';

import { db } from '@/lib/firebase';
import { getAdminBucket } from '@/lib/firebaseAdmin';
import {
  collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, setDoc,
  type DocumentSnapshot, runTransaction, type DocumentReference,
} from "firebase/firestore";
import type { Purchase, PurchaseFormValues, InventoryItem, LatestPurchaseInfo, PurchaseCategory, Currency } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { findOrCreateSupplier } from './supplier-service';

const PURCHASES_COLLECTION = 'purchases';

async function uploadInvoice(dataUri: string, purchaseId: string): Promise<{ downloadUrl: string; storagePath: string; contentType: string }> {
  const adminBucket = await getAdminBucket();

  const matches = dataUri.match(/^data:(.+);base64,(.*)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Formato de data URI inválido.');
  }

  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const fileExtension = contentType.split('/')[1] || 'bin';
  const path = `invoices/purchases/${purchaseId}/invoice_${Date.now()}.${fileExtension}`;
  try {
    const file = adminBucket.file(path);
    await file.save(buffer, {
      contentType: contentType,
      resumable: false,
    });
    
    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '01-01-2100'
    });

    console.log(`File uploaded to ${path}, Signed URL generated.`);
    return { downloadUrl: signedUrl, storagePath: path, contentType: contentType };
  } catch (err: any) {
    console.error(`Error uploading to Firebase Storage at path ${path}:`, err);
    throw new Error(`Failed to upload to storage: ${err.message}`);
  }
}

const fromFirestorePurchase = (docSnap: DocumentSnapshot): Purchase => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    supplier: data.supplier || '',
    supplierId: data.supplierId || undefined,
    categoryId: data.categoryId,
    costCenterIds: data.costCenterIds || [],
    currency: data.currency || 'EUR',
    items: data.items?.map((item: any) => ({ ...item, batchNumber: item.batchNumber || undefined })) || [],
    subtotal: data.subtotal || 0,
    tax: data.tax || 0,
    taxRate: data.taxRate ?? 21,
    shippingCost: data.shippingCost,
    totalAmount: data.totalAmount || 0,
    orderDate: data.orderDate instanceof Timestamp ? format(data.orderDate.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    status: data.status || 'Borrador',
    invoiceUrl: data.invoiceUrl || undefined,
    invoiceContentType: data.invoiceContentType || undefined,
    storagePath: data.storagePath || undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    batchesSeeded: data.batchesSeeded || false,
  };
};

const toFirestorePurchase = (data: Partial<PurchaseFormValues>, isNew: boolean, supplierId?: string): any => {
  const subtotal = data.items?.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0) || 0;
  const shippingCost = data.shippingCost || 0;
  const subtotalWithShipping = subtotal + shippingCost;
  const taxRate = data.taxRate !== undefined ? data.taxRate : 21;
  const tax = subtotalWithShipping * (taxRate / 100);
  const totalAmount = subtotalWithShipping + tax;

  const firestoreData: { [key: string]: any } = {
    supplier: data.supplier,
    categoryId: data.categoryId,
    costCenterIds: data.costCenterIds || [],
    currency: data.currency || 'EUR',
    orderDate: data.orderDate instanceof Date && isValid(data.orderDate) ? Timestamp.fromDate(data.orderDate) : Timestamp.fromDate(new Date()),
    status: data.status,
    items: data.items?.map(item => ({ 
        materialId: item.materialId, 
        description: item.description, 
        quantity: item.quantity, 
        unitPrice: item.unitPrice, 
        batchNumber: item.batchNumber || null,
        total: (item.quantity || 0) * (item.unitPrice || 0) 
    })) || [],
    subtotal,
    tax,
    taxRate,
    shippingCost,
    totalAmount,
    notes: data.notes || null,
    invoiceUrl: data.invoiceUrl || null,
    invoiceContentType: data.invoiceContentType || null,
    storagePath: data.storagePath || null,
  };

  if (supplierId) {
    firestoreData.supplierId = supplierId;
  }

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
    firestoreData.batchesSeeded = false;
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());

  return firestoreData;
};

export const getPurchasesFS = async (): Promise<Purchase[]> => {
  const purchasesCol = collection(db, PURCHASES_COLLECTION);
  const q = query(purchasesCol, orderBy('orderDate', 'desc'));
  const purchaseSnapshot = await getDocs(q);
  return purchaseSnapshot.docs.map(docSnap => fromFirestorePurchase(docSnap));
};

export const addPurchaseFS = async (data: PurchaseFormValues): Promise<string> => {
    let dataToSave = { ...data };
    const newDocRef = doc(collection(db, PURCHASES_COLLECTION));
    const purchaseId = newDocRef.id;

    if (data.invoiceDataUri) {
        console.log(`Uploading invoice for new purchase ID: ${purchaseId}`);
        const { downloadUrl, storagePath, contentType } = await uploadInvoice(data.invoiceDataUri, purchaseId);
        dataToSave.invoiceUrl = downloadUrl;
        dataToSave.storagePath = storagePath;
        dataToSave.invoiceContentType = contentType;
    }

    return await runTransaction(db, async (transaction) => {
        // --- READ PHASE ---
        const materialDocsToUpdate = new Map<string, { ref: DocumentReference; doc: DocumentSnapshot }>();
        if (dataToSave.status === 'Factura Recibida' && dataToSave.items) {
            for (const item of dataToSave.items) {
                if (item.materialId && item.quantity) {
                    const materialDocRef = doc(db, 'inventoryItems', item.materialId);
                    const materialDoc = await transaction.get(materialDocRef);
                    materialDocsToUpdate.set(item.materialId, { ref: materialDocRef, doc: materialDoc });
                }
            }
        }
        
        // --- WRITE PHASE ---
        const supplierId = await findOrCreateSupplier(data, transaction);
        if (!supplierId) {
            throw new Error("Failed to process supplier. Supplier name might be empty.");
        }
        
        const firestoreData = toFirestorePurchase(dataToSave, true, supplierId);

        if (dataToSave.status === 'Factura Recibida' && dataToSave.items) {
            for (const item of dataToSave.items) {
                if (item.materialId && item.quantity) {
                    const materialInfo = materialDocsToUpdate.get(item.materialId);
                    if (materialInfo && materialInfo.doc.exists()) {
                        const currentStock = materialInfo.doc.data().stock || 0;
                        const newStock = currentStock + item.quantity;
                        
                        const newLatestPurchase = {
                            quantityPurchased: item.quantity,
                            totalPurchaseCost: (item.quantity || 0) * (item.unitPrice || 0),
                            purchaseDate: format(firestoreData.orderDate.toDate(), "yyyy-MM-dd"),
                            calculatedUnitCost: item.unitPrice,
                            notes: firestoreData.notes || `Compra ${purchaseId}`,
                        };

                        transaction.update(materialInfo.ref, { 
                            stock: newStock,
                            latestPurchase: newLatestPurchase
                        });
                    }
                }
            }
            firestoreData.batchesSeeded = true;
        }

        transaction.set(newDocRef, firestoreData);
        console.log(`New purchase added with ID: ${purchaseId}`);
        return purchaseId;
    });
};

export const updatePurchaseFS = async (id: string, data: Partial<PurchaseFormValues>): Promise<void> => {
    let dataToSave = { ...data };

    if (data.invoiceDataUri) {
        console.log(`Uploading new invoice for existing purchase ID: ${id}`);
        if(data.storagePath) {
             try {
                const adminBucket = await getAdminBucket();
                await adminBucket.file(data.storagePath).delete();
                console.log(`Old invoice file deleted: ${data.storagePath}`);
            } catch (e) {
                console.warn(`Could not delete old invoice file ${data.storagePath}, it may not exist or permissions are insufficient.`);
            }
        }
        const { downloadUrl, storagePath, contentType } = await uploadInvoice(data.invoiceDataUri, id);
        dataToSave.invoiceUrl = downloadUrl;
        dataToSave.storagePath = storagePath;
        dataToSave.invoiceContentType = contentType;
    }

    await runTransaction(db, async (transaction) => {
        const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);

        // --- READ PHASE ---
        const existingPurchaseDoc = await transaction.get(purchaseDocRef);
        if (!existingPurchaseDoc.exists()) {
            throw new Error("Purchase not found");
        }
        const oldData = fromFirestorePurchase(existingPurchaseDoc);
        
        const oldStatusWasReceived = oldData.status === 'Factura Recibida';
        const newStatusIsReceived = data.status === 'Factura Recibida';

        const stockDeltas = new Map<string, number>();
        const materialIdsInvolved = new Set<string>();

        (oldData.items || []).forEach(item => item.materialId && materialIdsInvolved.add(item.materialId));
        (data.items || []).forEach(item => item.materialId && materialIdsInvolved.add(item.materialId));

        if (oldStatusWasReceived) {
            (oldData.items || []).forEach(oldItem => {
                if (oldItem.materialId && oldItem.quantity) {
                    stockDeltas.set(oldItem.materialId, (stockDeltas.get(oldItem.materialId) || 0) - oldItem.quantity);
                }
            });
        }
        if (newStatusIsReceived) {
            (data.items || []).forEach(newItem => {
                if (newItem.materialId && newItem.quantity) {
                    stockDeltas.set(newItem.materialId, (stockDeltas.get(newItem.materialId) || 0) + newItem.quantity);
                }
            });
        }
        
        const materialDocsToUpdate = new Map<string, { ref: DocumentReference; doc: DocumentSnapshot }>();
        for (const materialId of materialIdsInvolved) {
            const materialDocRef = doc(db, 'inventoryItems', materialId);
            const materialDoc = await transaction.get(materialDocRef);
            materialDocsToUpdate.set(materialId, { ref: materialDocRef, doc: materialDoc });
        }
        
        // --- WRITE PHASE ---
        let supplierId = await findOrCreateSupplier(data, transaction) || oldData.supplierId;
        const firestoreData = toFirestorePurchase(dataToSave as PurchaseFormValues, false, supplierId);
        
        if (newStatusIsReceived) {
            firestoreData.batchesSeeded = true;
        } else if (oldStatusWasReceived && !newStatusIsReceived) {
            firestoreData.batchesSeeden = false;
        }
        
        for (const [materialId, delta] of stockDeltas.entries()) {
            if (delta !== 0) {
                const materialInfo = materialDocsToUpdate.get(materialId);
                if (materialInfo && materialInfo.doc.exists()) {
                    const currentStock = materialInfo.doc.data().stock || 0;
                    transaction.update(materialInfo.ref, { stock: currentStock + delta });
                } else {
                    console.warn(`Material with ID ${materialId} not found during stock update. Skipping.`);
                }
            }
        }
        
        if (newStatusIsReceived) {
             for(const item of data.items || []) {
                if (item.materialId) {
                     const materialInfo = materialDocsToUpdate.get(item.materialId);
                     if(materialInfo && materialInfo.doc.exists()) {
                        const newLatestPurchase = {
                            quantityPurchased: item.quantity,
                            totalPurchaseCost: (item.quantity || 0) * (item.unitPrice || 0),
                            purchaseDate: format(firestoreData.orderDate.toDate(), "yyyy-MM-dd"),
                            calculatedUnitCost: item.unitPrice,
                            notes: firestoreData.notes || `Compra ${id}`,
                        };
                        transaction.update(materialInfo.ref, { latestPurchase: newLatestPurchase });
                     }
                }
             }
        }
        
        transaction.update(purchaseDocRef, firestoreData);
        console.log(`Purchase document ${id} updated.`);
    });
};

export const deletePurchaseFS = async (id: string): Promise<void> => {
  console.log(`Attempting to delete purchase document with ID: ${id}`);
  const purchaseDocRef = doc(db, PURCHASES_COLLECTION, id);
  const docSnap = await getDoc(purchaseDocRef);
  
  if (docSnap.exists()) {
      const data = fromFirestorePurchase(docSnap);
      if (data.status === 'Factura Recibida') {
        // Revert stock changes on deletion
        for (const item of data.items) {
          if (item.materialId && item.quantity) {
            const materialRef = doc(db, 'inventoryItems', item.materialId);
            try {
              await runTransaction(db, async (transaction) => {
                const materialDoc = await transaction.get(materialRef);
                if (materialDoc.exists()) {
                  const currentStock = materialDoc.data().stock || 0;
                  transaction.update(materialRef, { stock: currentStock - item.quantity });
                }
              });
            } catch (e) {
              console.error(`Failed to revert stock for item ${item.materialId} from purchase ${id}:`, e);
            }
          }
        }
      }
      
      if (data.storagePath) {
          try {
            const adminBucket = await getAdminBucket();
            console.log(`Deleting associated file from Storage: ${data.storagePath}`);
            await adminBucket.file(data.storagePath).delete();
            console.log(`File ${data.storagePath} deleted successfully.`);
          } catch(e: any) {
             console.error(`Failed to delete file from Storage at path ${data.storagePath}:`, e.message);
          }
      }
  }

  await deleteDoc(purchaseDocRef);
  console.log(`Purchase document ${id} deleted.`);
};

export const initializeMockPurchasesInFirestore = async (mockData: Purchase[]) => {
    const purchasesCol = collection(db, PURCHASES_COLLECTION);
    const snapshot = await getDocs(query(purchasesCol));
    if (snapshot.empty && mockData.length > 0) {
        for (const purchase of mockData) {
            const { id, createdAt, updatedAt, orderDate, ...purchaseData } = purchase;
            
            const firestoreReadyData: any = { ...purchaseData };
            firestoreReadyData.orderDate = orderDate ? Timestamp.fromDate(parseISO(orderDate)) : Timestamp.fromDate(new Date());
            firestoreReadyData.createdAt = createdAt ? Timestamp.fromDate(parseISO(createdAt)) : Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? Timestamp.fromDate(parseISO(updatedAt)) : Timestamp.fromDate(new Date());
            
            await addDoc(purchasesCol, firestoreReadyData);
        }
        console.log('Mock purchases initialized in Firestore.');
    }
};
