
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import * as adminFirestore from 'firebase-admin/firestore';
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
    createdAt: data.createdAt instanceof adminFirestore.Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    updatedAt: data.updatedAt instanceof adminFirestore.Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
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
    firestoreData.createdAt = adminFirestore.Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = adminFirestore.Timestamp.fromDate(new Date());
  
  return firestoreData;
};

export const getSuppliersFS = async (): Promise<Supplier[]> => {
  const suppliersCol = adminFirestore.collection(db, SUPPLIERS_COLLECTION);
  const q = adminFirestore.query(suppliersCol, adminFirestore.orderBy('name', 'asc'));
  const snapshot = await adminFirestore.getDocs(q);
  return snapshot.docs.map(docSnap => fromFirestoreSupplier(docSnap));
};

export const getSupplierByIdFS = async (id: string): Promise<Supplier | null> => {
  if (!id) return null;
  const docRef = adminFirestore.doc(db, SUPPLIERS_COLLECTION, id);
  const docSnap = await adminFirestore.getDoc(docRef);
  return docSnap.exists() ? fromFirestoreSupplier(docSnap) : null;
};

export const getSupplierByNameFS = async (name: string): Promise<Supplier | null> => {
  if (!name || name.trim() === '') return null;
  const q = adminFirestore.query(adminFirestore.collection(db, SUPPLIERS_COLLECTION), adminFirestore.where('name', '==', name), adminFirestore.limit(1));
  const snapshot = await adminFirestore.getDocs(q);
  if (!snapshot.empty) {
    return fromFirestoreSupplier(snapshot.docs[0]);
  }
  return null;
};

export const getSupplierByCifFS = async (cif: string): Promise<Supplier | null> => {
    if (!cif || cif.trim() === '') return null;
    const q = adminFirestore.query(adminFirestore.collection(db, SUPPLIERS_COLLECTION), adminFirestore.where('cif', '==', cif), adminFirestore.limit(1));
    const snapshot = await adminFirestore.getDocs(q);
    if (!snapshot.empty) {
        return fromFirestoreSupplier(snapshot.docs[0]);
    }
    return null;
}

export const addSupplierFS = async (data: SupplierFormValues): Promise<string> => {
  const firestoreData = toFirestoreSupplier(data, true);
  const docRef = await adminFirestore.addDoc(adminFirestore.collection(db, SUPPLIERS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateSupplierFS = async (id: string, data: Partial<SupplierFormValues>): Promise<void> => {
  const docRef = adminFirestore.doc(db, SUPPLIERS_COLLECTION, id);
  const firestoreData = toFirestoreSupplier(data, false);
  await adminFirestore.updateDoc(docRef, firestoreData);
};

export const deleteSupplierFS = async (id: string): Promise<void> => {
  const docRef = adminFirestore.doc(db, SUPPLIERS_COLLECTION, id);
  await adminFirestore.deleteDoc(docRef);
};
