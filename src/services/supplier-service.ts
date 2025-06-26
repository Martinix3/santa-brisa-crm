
'use server';

import { adminDb as db, collection, query, where, limit, orderBy, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, Timestamp } from '@/lib/firebaseAdmin';
import type { Supplier, SupplierFormValues, AddressDetails } from '@/types';
import { format, parseISO } from 'date-fns';

const SUPPLIERS_COLLECTION = 'suppliers';

const fromFirestoreSupplier = (docSnap: adminFirestore.DocumentSnapshot<adminFirestore.DocumentData>): Supplier => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");
  return {
    id: docSnap.id,
    name: data.name || '',
    cif: data.cif,
    address: data.address,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    notes: data.notes,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  };
};

const toFirestoreSupplier = (data: Partial<SupplierFormValues>, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    cif: data.cif || null,
    contactName: data.contactName || null,
    contactEmail: data.contactEmail || null,
    contactPhone: data.contactPhone || null,
    notes: data.notes || null,
  };

  if (data.address_street || data.address_city || data.address_province || data.address_postalCode) {
    firestoreData.address = {
      street: data.address_street || null,
      number: data.address_number || null,
      city: data.address_city || null,
      province: data.address_province || null,
      postalCode: data.address_postalCode || null,
      country: data.address_country || "España",
    };
    Object.keys(firestoreData.address).forEach(key => {
      if (firestoreData.address[key] === undefined) {
        firestoreData.address[key] = null;
      }
    });
  } else {
    firestoreData.address = null;
  }

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());
  
  return firestoreData;
};

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
  const q = query(collection(db, SUPPLIERS_COLLECTION), where('name', '==', name), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return fromFirestoreSupplier(snapshot.docs[0]);
  }
  return null;
};

export const getSupplierByCifFS = async (cif: string): Promise<Supplier | null> => {
    if (!cif || cif.trim() === '') return null;
    const q = query(collection(db, SUPPLIERS_COLLECTION), where('cif', '==', cif), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return fromFirestoreSupplier(snapshot.docs[0]);
    }
    return null;
}

export const addSupplierFS = async (data: SupplierFormValues): Promise<string> => {
  const firestoreData = toFirestoreSupplier(data, true);
  const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), firestoreData);
  return docRef.id;
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
