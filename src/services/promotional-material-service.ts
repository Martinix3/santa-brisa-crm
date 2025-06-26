
'use server';

import { adminDb as db, collection, query, orderBy, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, writeBatch, Timestamp } from '@/lib/firebaseAdmin';
import type { PromotionalMaterial, PromotionalMaterialFormValues, LatestPurchaseInfo } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const PROMOTIONAL_MATERIALS_COLLECTION = 'promotionalMaterials';

const fromFirestorePromotionalMaterial = (docSnap: adminFirestore.DocumentSnapshot<adminFirestore.DocumentData>): PromotionalMaterial => {
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
  };
};

const toFirestorePromotionalMaterial = (data: PromotionalMaterialFormValues, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    type: data.type,
    description: data.description || null,
  };

  if (data.latestPurchaseQuantity && data.latestPurchaseTotalCost && data.latestPurchaseDate) {
    const calculatedUnitCost = data.latestPurchaseTotalCost / data.latestPurchaseQuantity;
    firestoreData.latestPurchase = {
      quantityPurchased: data.latestPurchaseQuantity,
      totalPurchaseCost: data.latestPurchaseTotalCost,
      purchaseDate: data.latestPurchaseDate instanceof Date && isValid(data.latestPurchaseDate) ? Timestamp.fromDate(data.latestPurchaseDate) : Timestamp.fromDate(new Date()),
      calculatedUnitCost: parseFloat(calculatedUnitCost.toFixed(4)),
      notes: data.latestPurchaseNotes || null,
    };
  } else {
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
  await updateDoc(materialDocRef, firestoreData);
};

export const deletePromotionalMaterialFS = async (id: string): Promise<void> => {
  const materialDocRef = doc(db, PROMOTIONAL_MATERIALS_COLLECTION, id);
  await deleteDoc(materialDocRef);
};

export const initializeMockPromotionalMaterialsInFirestore = async (mockMaterialsData: PromotionalMaterial[]) => {
    const materialsCol = collection(db, PROMOTIONAL_MATERIALS_COLLECTION);
    const snapshot = await getDocs(query(materialsCol));
    if (snapshot.empty && mockMaterialsData.length > 0) {
        const batch = writeBatch(db);
        mockMaterialsData.forEach(material => {
            const { id, ...materialData } = material; 
            
            const formValues: PromotionalMaterialFormValues = {
                name: material.name,
                type: material.type,
                description: material.description,
                latestPurchaseQuantity: material.latestPurchase?.quantityPurchased,
                latestPurchaseTotalCost: material.latestPurchase?.totalPurchaseCost,
                latestPurchaseDate: material.latestPurchase?.purchaseDate ? parseISO(material.latestPurchase.purchaseDate) : undefined,
                latestPurchaseNotes: material.latestPurchase?.notes,
            };

            const firestoreReadyData = toFirestorePromotionalMaterial(formValues, true);
            const docRef = doc(materialsCol); 
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock promotional materials initialized in Firestore.');
    } else if (mockMaterialsData.length === 0) {
        console.log('No mock promotional materials to seed.');
    } else {
        console.log('PromotionalMaterials collection is not empty. Skipping initialization.');
    }
};
