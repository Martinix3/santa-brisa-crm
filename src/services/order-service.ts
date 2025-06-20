
"use client";

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  where,
  WriteBatch,
  writeBatch
} from 'firebase/firestore';
import type { Order, OrderFormValues, CanalOrigenColocacion } from '@/types'; // Added CanalOrigenColocacion
import { format, parseISO, isValid } from 'date-fns';

const ORDERS_COLLECTION = 'orders';

// Helper para convertir datos de Firestore a tipo Order (UI)
const fromFirestoreOrder = (docSnap: any): Order => {
  const data = docSnap.data();
  const order: Order = {
    id: docSnap.id,
    clientName: data.clientName || '',
    visitDate: data.visitDate instanceof Timestamp ? format(data.visitDate.toDate(), "yyyy-MM-dd") : (typeof data.visitDate === 'string' ? data.visitDate : format(new Date(), "yyyy-MM-dd")),
    products: data.products || [],
    value: data.value,
    status: data.status || 'Pendiente',
    salesRep: data.salesRep || '',
    lastUpdated: data.lastUpdated instanceof Timestamp ? format(data.lastUpdated.toDate(), "yyyy-MM-dd") : (typeof data.lastUpdated === 'string' ? data.lastUpdated : format(new Date(), "yyyy-MM-dd")),
    clavadistaId: data.clavadistaId || undefined,
    assignedMaterials: data.assignedMaterials || [],
    canalOrigenColocacion: data.canalOrigenColocacion || undefined, // Added field
    clientType: data.clientType,
    numberOfUnits: data.numberOfUnits,
    unitPrice: data.unitPrice,
    clientStatus: data.clientStatus,
    nombreFiscal: data.nombreFiscal || '',
    cif: data.cif || '',
    direccionFiscal: data.direccionFiscal || '',
    direccionEntrega: data.direccionEntrega || '',
    contactoNombre: data.contactoNombre || '',
    contactoCorreo: data.contactoCorreo || '',
    contactoTelefono: data.contactoTelefono || '',
    observacionesAlta: data.observacionesAlta || '',
    notes: data.notes || '',
    nextActionType: data.nextActionType,
    nextActionCustom: data.nextActionCustom || '',
    nextActionDate: data.nextActionDate instanceof Timestamp ? format(data.nextActionDate.toDate(), "yyyy-MM-dd") : (typeof data.nextActionDate === 'string' ? data.nextActionDate : undefined),
    failureReasonType: data.failureReasonType,
    failureReasonCustom: data.failureReasonCustom || '',
    accountId: data.accountId || undefined,
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : format(new Date(), "yyyy-MM-dd")),
  };
  return order;
};

// Helper para convertir datos del formulario/UI a lo que se guarda en Firestore
const toFirestoreOrder = (data: Partial<Order> & { visitDate: Date | string, nextActionDate?: Date | string, accountId?: string }, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {};

  // Map all known fields from Order type, converting dates to Timestamps
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = (data as any)[key];
      if (value === undefined && key !== 'canalOrigenColocacion' && key !== 'clavadistaId' && key !== 'nextActionDate' && key !== 'accountId' && key !== 'products' && key !== 'assignedMaterials' && key !== 'value' && key !== 'clientType' && key !== 'numberOfUnits' && key !== 'unitPrice' && key !== 'clientStatus' && key !== 'nombreFiscal' && key !== 'cif' && key !== 'direccionFiscal' && key !== 'direccionEntrega' && key !== 'contactoNombre' && key !== 'contactoCorreo' && key !== 'contactoTelefono' && key !== 'observacionesAlta' && key !== 'notes' && key !== 'nextActionType' && key !== 'nextActionCustom' && key !== 'failureReasonType' && key !== 'failureReasonCustom' && key !== 'createdAt') continue;

      if ((key === 'visitDate' || key === 'nextActionDate' || key === 'lastUpdated' || key === 'createdAt') && value) {
        const dateValue = typeof value === 'string' ? parseISO(value) : value;
        if (dateValue instanceof Date && isValid(dateValue)) {
          firestoreData[key] = Timestamp.fromDate(dateValue);
        } else if (value instanceof Timestamp) {
           firestoreData[key] = value;
        }
      } else {
        firestoreData[key] = value;
      }
    }
  }
  
  firestoreData.clavadistaId = data.clavadistaId || null;
  firestoreData.nextActionDate = data.nextActionDate ? (firestoreData.nextActionDate instanceof Timestamp ? firestoreData.nextActionDate : Timestamp.fromDate(typeof data.nextActionDate === 'string' ? parseISO(data.nextActionDate) : data.nextActionDate)) : null;
  firestoreData.accountId = data.accountId || null;
  firestoreData.assignedMaterials = data.assignedMaterials || [];
  firestoreData.canalOrigenColocacion = data.canalOrigenColocacion || null; // Store null if undefined

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.lastUpdated = Timestamp.fromDate(new Date());

  // Clean up any undefined fields that might have slipped through
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      firestoreData[key] = null; // Ensure undefined becomes null
    }
  });

  return firestoreData;
};


export const getOrdersFS = async (): Promise<Order[]> => {
  const ordersCol = collection(db, ORDERS_COLLECTION);
  const q = query(ordersCol, orderBy('createdAt', 'desc')); // Order by creation date
  const orderSnapshot = await getDocs(q);
  const orderList = orderSnapshot.docs.map(docSnap => fromFirestoreOrder(docSnap));
  return orderList;
};

export const getOrderByIdFS = async (id: string): Promise<Order | null> => {
  if (!id) {
    console.warn("getOrderByIdFS called with no ID.");
    return null;
  }
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  const docSnap = await getDoc(orderDocRef);
  if (docSnap.exists()) {
    return fromFirestoreOrder(docSnap);
  } else {
    console.warn(`Order with ID ${id} not found in Firestore.`);
    return null;
  }
};

// data is expected to be OrderFormValues or a similar structure
export const addOrderFS = async (data: Partial<Order> & {visitDate: Date | string, accountId?: string}): Promise<string> => {
  const firestoreData = toFirestoreOrder(data, true);
  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateOrderFS = async (id: string, data: Partial<Order> & {visitDate?: Date | string}): Promise<void> => { // visitDate made optional for updates
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  const firestoreData = toFirestoreOrder(data, false); 
  await updateDoc(orderDocRef, firestoreData);
};

export const deleteOrderFS = async (id: string): Promise<void> => {
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  await deleteDoc(orderDocRef);
};


// Optional: Utility to initialize mock data if collection is empty
export const initializeMockOrdersInFirestore = async (mockOrdersData: Order[]) => {
    const ordersCol = collection(db, ORDERS_COLLECTION);
    const snapshot = await getDocs(query(ordersCol));
    if (snapshot.empty) {
        const batch = writeBatch(db);
        mockOrdersData.forEach(order => {
            const { id, createdAt, visitDate, lastUpdated, nextActionDate, ...orderData } = order; 
            
            const firestoreReadyData: any = { ...orderData };

            if (visitDate) firestoreReadyData.visitDate = Timestamp.fromDate(parseISO(visitDate));
            firestoreReadyData.lastUpdated = lastUpdated ? Timestamp.fromDate(parseISO(lastUpdated)) : Timestamp.fromDate(new Date());
            firestoreReadyData.createdAt = createdAt ? Timestamp.fromDate(parseISO(createdAt)) : Timestamp.fromDate(new Date());
            if (nextActionDate) firestoreReadyData.nextActionDate = Timestamp.fromDate(parseISO(nextActionDate));
            else firestoreReadyData.nextActionDate = null;

            firestoreReadyData.clavadistaId = order.clavadistaId || null;
            firestoreReadyData.accountId = order.accountId || null;
            firestoreReadyData.assignedMaterials = order.assignedMaterials || [];
            firestoreReadyData.canalOrigenColocacion = order.canalOrigenColocacion || null;
            
            // Clean up undefined or empty strings for optional fields
            Object.keys(firestoreReadyData).forEach(key => {
                if (firestoreReadyData[key] === undefined) {
                   firestoreReadyData[key] = null; // Store undefined as null
                } else if (typeof firestoreReadyData[key] === 'string' && firestoreReadyData[key].trim() === '' && 
                           !['salesRep', 'clientName', 'status'].includes(key) ) { // Keep essential strings even if empty for some reason
                   firestoreReadyData[key] = null;
                }
            });


            const docRef = doc(ordersCol); // Firestore generates ID
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock orders initialized in Firestore.');
    } else {
        console.log('Orders collection is not empty. Skipping initialization.');
    }
};
