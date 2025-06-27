
'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, runTransaction,
  type DocumentSnapshot,
} from "firebase/firestore";
import type { PromotionalMaterial, PromotionalMaterialFormValues, LatestPurchaseInfo } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const PROMOTIONAL_MATERIALS_COLLECTION = 'promotionalMaterials';

const fromFirestorePromotionalMaterial = (docSnap: DocumentSnapshot): PromotionalMaterial => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  let latestPurchase: LatestPurchaseInfo | undefined = undefined;
  if (data.latestPurchase) {
    latestPurchase = {
      quantityPurchased: data.latestPurchase.quantityPurchased || 0,
      totalPurchaseCost: data.latestPurchase.totalPurchaseCost || 0,
      purchaseDate: data.latestPurchase.purchaseDate instanceof Timestamp ? format(data.latestPurchase.purchaseDate.toDate(), "yyyy-MM-dd") : (typeof data.latestPurchase.purchaseDate === 'string' ? data.latestPurchase.purchaseDate : format(new Date(), "yyyy-MM-dd")),
      calculatedUnitCost: data.latestPurchase.calculatedUnitCost || 0,
      notes: data.latestPurchase.notes || undefined,
    };
  }

  return {
    id: docSnap.id,
    name: data.name || '',
    type: data.type || 'Otro',
    description: data.description || undefined,
    latestPurchase: latestPurchase,
    stock: data.stock || 0,
    sku: data.sku || undefined,
  };
};

const toFirestorePromotionalMaterial = (data: PromotionalMaterialFormValues, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    type: data.type,
    description: data.description || null,
    sku: data.sku || null,
  };
  
  if (isNew) {
    firestoreData.stock = 0;
  }

  if (data.latestPurchaseQuantity && data.latestPurchaseTotalCost && data.latestPurchaseDate) {
    const calculatedUnitCost = data.latestPurchaseTotalCost / data.latestPurchaseQuantity;
    firestoreData.latestPurchase = {
      quantityPurchased: data.latestPurchaseQuantity,
      totalPurchaseCost: data.latestPurchaseTotalCost,
      purchaseDate: data.latestPurchaseDate instanceof Date && isValid(data.latestPurchaseDate) ? Timestamp.fromDate(data.latestPurchaseDate) : Timestamp.fromDate(new Date()),
      calculatedUnitCost: parseFloat(calculatedUnitCost.toFixed(4)),
      notes: data.latestPurchaseNotes || null,
    };
    if (isNew) {
        firestoreData.stock = data.latestPurchaseQuantity;
    }
  } else if (isNew) {
    firestoreData.latestPurchase = null;
  }

  return firestoreData;
};

export const getPromotionalMaterialsFS = async (): Promise<PromotionalMaterial[]> => {
  const materialsCol = collection(db, PROMOTIONAL_MATERIALS_COLLECTION);
  const q = query(materialsCol, orderBy('name', 'asc'));
  const materialSnapshot = await getDocs(q);
  return materialSnapshot.docs.map(docSnap => fromFirestorePromotionalMaterial(docSnap));
};

export const getPromotionalMaterialByIdFS = async (id: string): Promise<PromotionalMaterial | null> => {
  if (!id) return null;
  const materialDocRef = doc(db, PROMOTIONAL_MATERIALS_COLLECTION, id);
  const docSnap = await getDoc(materialDocRef);
  return docSnap.exists() ? fromFirestorePromotionalMaterial(docSnap) : null;
};

export const addPromotionalMaterialFS = async (data: PromotionalMaterialFormValues): Promise<string> => {
  const firestoreData = toFirestorePromotionalMaterial(data, true);
  const docRef = await addDoc(collection(db, PROMOTIONAL_MATERIALS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updatePromotionalMaterialFS = async (id: string, data: PromotionalMaterialFormValues): Promise<void> => {
  const materialDocRef = doc(db, PROMOTIONAL_MATERIALS_COLLECTION, id);
  const firestoreData = toFirestorePromotionalMaterial(data, false);
  
  const existingDoc = await getDoc(materialDocRef);
  if (existingDoc.exists()) {
    const oldData = fromFirestorePromotionalMaterial(existingDoc);
    const oldPurchaseQty = oldData.latestPurchase?.quantityPurchased || 0;
    const newPurchaseQty = data.latestPurchaseQuantity || 0;
    firestoreData.stock = (oldData.stock - oldPurchaseQty) + newPurchaseQty;
  }
  
  await updateDoc(materialDocRef, firestoreData);
};

export const deletePromotionalMaterialFS = async (id: string): Promise<void> => {
  const materialDocRef = doc(db, PROMOTIONAL_MATERIALS_COLLECTION, id);
  await deleteDoc(materialDocRef);
};

export const processMaterialUpdateFromPurchase = async (
    materialId: string, 
    quantityChange: number,
    purchaseInfo?: {
        quantityPurchased: number;
        totalPurchaseCost: number;
        purchaseDate: string; // YYYY-MM-DD
        calculatedUnitCost: number;
        notes?: string;
    }
): Promise<void> => {
    const materialDocRef = doc(db, PROMOTIONAL_MATERIALS_COLLECTION, materialId);

    try {
        await runTransaction(db, async (transaction) => {
            const materialDoc = await transaction.get(materialDocRef);
            if (!materialDoc.exists()) {
                throw new Error(`Material with ID ${materialId} does not exist.`);
            }

            const currentStock = materialDoc.data().stock || 0;
            const newStock = currentStock + quantityChange;
            
            const updatePayload: { [key: string]: any } = { stock: newStock };

            if (purchaseInfo) {
                updatePayload.latestPurchase = {
                    quantityPurchased: purchaseInfo.quantityPurchased,
                    totalPurchaseCost: purchaseInfo.totalPurchaseCost,
                    purchaseDate: Timestamp.fromDate(parseISO(purchaseInfo.purchaseDate)),
                    calculatedUnitCost: purchaseInfo.calculatedUnitCost,
                    notes: purchaseInfo.notes || null,
                }
            }
            
            transaction.update(materialDocRef, updatePayload);
        });
    } catch (e) {
        console.error("Stock/Purchase update transaction failed: ", e);
        throw e;
    }
};


export const updateMaterialStockFS = async (materialId: string, quantityChange: number): Promise<void> => {
  if (!materialId || typeof quantityChange !== 'number') {
    console.error("Invalid arguments for updateMaterialStockFS:", { materialId, quantityChange });
    return;
  }

  const materialDocRef = doc(db, PROMOTIONAL_MATERIALS_COLLECTION, materialId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const materialDoc = await transaction.get(materialDocRef);
      if (!materialDoc.exists()) {
        throw new Error(`Material with ID ${materialId} does not exist.`);
      }

      const currentStock = materialDoc.data().stock || 0;
      const newStock = currentStock + quantityChange;

      console.log(`Updating stock for material ${materialId}. Current: ${currentStock}, Change: ${quantityChange}, New: ${newStock}`);
      
      transaction.update(materialDocRef, { stock: newStock });
    });
  } catch (e) {
    console.error("Stock update transaction failed: ", e);
    throw e; // Re-throw the error to be handled by the caller
  }
};


export const initializeMockPromotionalMaterialsInFirestore = async (mockMaterialsData: PromotionalMaterial[]) => {
    const materialsCol = collection(db, PROMOTIONAL_MATERIALS_COLLECTION);
    const snapshot = await getDocs(query(materialsCol, orderBy('name', 'asc')));
    if (snapshot.empty && mockMaterialsData.length > 0) {
        for (const material of mockMaterialsData) {
            const { id, stock, ...materialData } = material; 
            
            const formValues: PromotionalMaterialFormValues = {
                name: material.name,
                type: material.type,
                description: material.description,
                sku: material.sku,
                latestPurchaseQuantity: material.latestPurchase?.quantityPurchased,
                latestPurchaseTotalCost: material.latestPurchase?.totalPurchaseCost,
                latestPurchaseDate: material.latestPurchase?.purchaseDate ? parseISO(material.latestPurchase.purchaseDate) : undefined,
                latestPurchaseNotes: material.latestPurchase?.notes,
            };

            const firestoreReadyData = toFirestorePromotionalMaterial(formValues, true);

            await addDoc(materialsCol, firestoreReadyData);
        }
        console.log('Mock promotional materials initialized in Firestore.');
    } else if (mockMaterialsData.length === 0) {
        console.log('No mock promotional materials to seed.');
    } else {
        console.log('PromotionalMaterials collection is not empty. Skipping initialization.');
    }
};
