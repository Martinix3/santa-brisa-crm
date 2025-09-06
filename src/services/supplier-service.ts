import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, collectionGroup
} from "firebase/firestore";
import type { Supplier, SupplierFormValues } from '@/types';
import { fromFirestoreSupplier, toFirestoreSupplier } from './utils/firestore-converters';

const SUPPLIERS_COLLECTION = 'suppliers';

export const getSuppliersFS = async (): Promise<Supplier[]> => {
  const suppliersCol = collection(db, SUPPLIERS_COLLECTION);
  const q = query(suppliersCol, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => fromFirestoreSupplier(docSnap));
};

export const getSupplierByIdFS = async (id: string): Promise<Supplier | null> => {
  if (!id) return null;
  const docRef = doc(db, SUPPLIERS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? fromFirestoreSupplier(docSnap) : null;
};

export const getSupplierByNameFS = async (name: string): Promise<Supplier | null> => {
  if (!name || name.trim() === '') return null;
  const q = query(collection(db, SUPPLIERS_COLLECTION), where('name', '==', name));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return fromFirestoreSupplier(snapshot.docs[0]);
  }
  return null;
};

export const getSupplierByCifFS = async (cif: string): Promise<Supplier | null> => {
    if (!cif || cif.trim() === '') return null;
    const q = query(collection(db, SUPPLIERS_COLLECTION), where('cif', '==', cif));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return fromFirestoreSupplier(snapshot.docs[0]);
    }
    return null;
}

export const addSupplierFS = async (data: SupplierFormValues): Promise<Supplier | null> => {
  const firestoreData = toFirestoreSupplier(data, true);
  // Check for duplicates before adding
  const q = query(collection(db, SUPPLIERS_COLLECTION), where('name', '==', firestoreData.name));
  const snapshot = await getDocs(q);
  if(!snapshot.empty) {
    throw new Error(`Ya existe un proveedor con el nombre "${firestoreData.name}".`);
  }

  const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), firestoreData);
  const newDoc = await getDoc(docRef);
  return fromFirestoreSupplier(newDoc);
};


export const updateSupplierFS = async (id: string, data: Partial<SupplierFormValues>): Promise<void> => {
  const docRef = doc(db, SUPPLIERS_COLLECTION, id);
  const firestoreData = toFirestoreSupplier(data, false);
  await updateDoc(docRef, firestoreData);
};

export const deleteSupplierFS = async (id: string): Promise<void> => {
  const docRef = doc(db, SUPPLIERS_COLLECTION, id);
  await deleteDoc(docRef);
};
