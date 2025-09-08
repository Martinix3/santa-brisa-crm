
import { adminDb } from '@/lib/firebaseAdmin';
import {
  collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
} from "firebase-admin/firestore";
import type { Supplier, SupplierFormValues } from '@/types';
import { fromFirestoreSupplier, toFirestoreSupplier } from './utils/firestore-converters';

const SUPPLIERS_COLLECTION = 'suppliers';

export const getSuppliersFS = async (): Promise<Supplier[]> => {
  const suppliersCol = adminDb.collection(SUPPLIERS_COLLECTION);
  const q = suppliersCol.orderBy('name', 'asc');
  const snapshot = await q.get();
  return snapshot.docs.map(docSnap => fromFirestoreSupplier(docSnap));
};

export const getSupplierByIdFS = async (id: string): Promise<Supplier | null> => {
  if (!id) return null;
  const docRef = adminDb.collection(SUPPLIERS_COLLECTION).doc(id);
  const docSnap = await docRef.get();
  return docSnap.exists ? fromFirestoreSupplier(docSnap) : null;
};

export const getSupplierByNameFS = async (name: string): Promise<Supplier | null> => {
  if (!name || name.trim() === '') return null;
  const suppliersCol = adminDb.collection(SUPPLIERS_COLLECTION);
  const q = suppliersCol.where('name', '==', name);
  const snapshot = await q.get();
  if (!snapshot.empty) {
    return fromFirestoreSupplier(snapshot.docs[0]);
  }
  return null;
};

export const getSupplierByCifFS = async (cif: string): Promise<Supplier | null> => {
    if (!cif || cif.trim() === '') return null;
    const suppliersCol = adminDb.collection(SUPPLIERS_COLLECTION);
    const q = suppliersCol.where('cif', '==', cif);
    const snapshot = await q.get();
    if (!snapshot.empty) {
        return fromFirestoreSupplier(snapshot.docs[0]);
    }
    return null;
}

export const addSupplierFS = async (data: SupplierFormValues): Promise<Supplier | null> => {
  const firestoreData = toFirestoreSupplier(data, true);
  // Check for duplicates before adding
  const suppliersCol = adminDb.collection(SUPPLIERS_COLLECTION);
  const q = suppliersCol.where('name', '==', firestoreData.name);
  const snapshot = await q.get();
  if(!snapshot.empty) {
    throw new Error(`Ya existe un proveedor con el nombre "${firestoreData.name}".`);
  }

  const docRef = await adminDb.collection(SUPPLIERS_COLLECTION).add(firestoreData);
  const newDoc = await docRef.get();
  return fromFirestoreSupplier(newDoc);
};


export const updateSupplierFS = async (id: string, data: Partial<SupplierFormValues>): Promise<void> => {
  const docRef = adminDb.collection(SUPPLIERS_COLLECTION).doc(id);
  const firestoreData = toFirestoreSupplier(data, false);
  await docRef.update(firestoreData);
};

export const deleteSupplierFS = async (id: string): Promise<void> => {
  const docRef = adminDb.collection(SUPPLIERS_COLLECTION).doc(id);
  await deleteDoc(docRef);
};
