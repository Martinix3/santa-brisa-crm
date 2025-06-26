

'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import type { firestore as adminFirestore } from 'firebase-admin';
import type { PromotionalMaterial, PromotionalMaterialFormValues, LatestPurchaseInfo } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const PROMOTIONAL_MATERIALS_COLLECTION = 'promotionalMaterials';

const fromFirestorePromotionalMaterial = (docSnap: adminFirestore.DocumentSnapshot): PromotionalMaterial => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  let latestPurchase: LatestPurchaseInfo | undefined = undefined;
  if (data.latestPurchase) {
    latestPurchase = {
      quantityPurchased: data.latestPurchase.quantityPurchased || 0,
      totalPurchaseCost: data.latestPurchase.totalPurchaseCost || 0,
      purchaseDate: data.latestPurchase.purchaseDate instanceof adminFirestore.Timestamp ? format(data.latestPurchase.purchaseDate.toDate(), "yyyy-MM-dd") : (typeof data.latestPurchase.purchaseDate === 'string' ? data.latestPurchase.purchaseDate : format(new Date(), "yyyy-MM-dd")),
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
      purchaseDate: data.latestPurchaseDate instanceof Date && isValid(data.latestPurchaseDate) ? adminFirestore.Timestamp.fromDate(data.latestPurchaseDate) : adminFirestore.Timestamp.fromDate(new Date()),
      calculatedUnitCost: parseFloat(calculatedUnitCost.toFixed(4)),
      notes: data.latestPurchaseNotes || null,
    };
  } else {
    firestoreData.latestPurchase = null;
  }

  return firestoreData;
};

export const getPromotionalMaterialsFS = async (): Promise<PromotionalMaterial[]> => {
  const materialsCol = db.collection(PROMOTIONAL_MATERIALS_COLLECTION);
  const materialSnapshot = await materialsCol.orderBy('name', 'asc').get();
  return materialSnapshot.docs.map(docSnap => fromFirestorePromotionalMaterial(docSnap));
};

export const getPromotionalMaterialByIdFS = async (id: string): Promise<PromotionalMaterial | null> => {
  if (!id) return null;
  const materialDocRef = db.collection(PROMOTIONAL_MATERIALS_COLLECTION).doc(id);
  const docSnap = await materialDocRef.get();
  return docSnap.exists ? fromFirestorePromotionalMaterial(docSnap) : null;
};

export const addPromotionalMaterialFS = async (data: PromotionalMaterialFormValues): Promise<string> => {
  const firestoreData = toFirestorePromotionalMaterial(data, true);
  const docRef = await db.collection(PROMOTIONAL_MATERIALS_COLLECTION).add(firestoreData);
  return docRef.id;
};

export const updatePromotionalMaterialFS = async (id: string, data: PromotionalMaterialFormValues): Promise<void> => {
  const materialDocRef = db.collection(PROMOTIONAL_MATERIALS_COLLECTION).doc(id);
  const firestoreData = toFirestorePromotionalMaterial(data, false);
  await materialDocRef.update(firestoreData);
};

export const deletePromotionalMaterialFS = async (id: string): Promise<void> => {
  const materialDocRef = db.collection(PROMOTIONAL_MATERIALS_COLLECTION).doc(id);
  await materialDocRef.delete();
};

export const initializeMockPromotionalMaterialsInFirestore = async (mockMaterialsData: PromotionalMaterial[]) => {
    const materialsCol = db.collection(PROMOTIONAL_MATERIALS_COLLECTION);
    const snapshot = await materialsCol.limit(1).get();
    if (snapshot.empty && mockMaterialsData.length > 0) {
        const batch = db.batch();
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
            const docRef = materialsCol.doc(); 
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
