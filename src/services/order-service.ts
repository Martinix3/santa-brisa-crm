
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
import type { Order, OrderFormValues, CanalOrigenColocacion, AddressDetails, PaymentMethod } from '@/types'; 
import { format, parseISO, isValid } from 'date-fns';

const ORDERS_COLLECTION = 'orders';

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
    canalOrigenColocacion: data.canalOrigenColocacion || undefined,
    paymentMethod: data.paymentMethod || undefined,
    invoiceUrl: data.invoiceUrl || undefined,
    invoiceFileName: data.invoiceFileName || undefined,

    clientType: data.clientType,
    numberOfUnits: data.numberOfUnits, 
    unitPrice: data.unitPrice, 
    clientStatus: data.clientStatus,

    nombreFiscal: data.nombreFiscal || '',
    cif: data.cif || '',
    direccionFiscal: data.direccionFiscal, 
    direccionEntrega: data.direccionEntrega, 
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

const toFirestoreOrder = (data: Partial<Order> & { 
    visitDate: Date | string, 
    nextActionDate?: Date | string, 
    accountId?: string,
    direccionFiscal_street?: string, direccionFiscal_number?: string, direccionFiscal_city?: string, direccionFiscal_province?: string, direccionFiscal_postalCode?: string, direccionFiscal_country?: string,
    direccionEntrega_street?: string, direccionEntrega_number?: string, direccionEntrega_city?: string, direccionEntrega_province?: string, direccionEntrega_postalCode?: string, direccionEntrega_country?: string,
}, isNew: boolean): any => {
  
  const firestoreData: { [key: string]: any } = {};

  const directOrderKeys: (keyof Order)[] = [
    'clientName', 'products', 'value', 'status', 'salesRep', 'clavadistaId', 
    'assignedMaterials', 'canalOrigenColocacion', 'paymentMethod', 'invoiceUrl', 'invoiceFileName', 
    'clientType', 'numberOfUnits', 'unitPrice', 'clientStatus', 'nombreFiscal', 'cif', 
    'contactoNombre', 'contactoCorreo', 'contactoTelefono', 'observacionesAlta', 
    'notes', 'nextActionType', 'nextActionCustom', 'failureReasonType', 
    'failureReasonCustom', 'accountId'
  ];

  directOrderKeys.forEach(key => {
    if (data[key] !== undefined) {
      firestoreData[key] = data[key];
    } else {
      if (['clavadistaId', 'canalOrigenColocacion', 'paymentMethod', 'invoiceUrl', 'invoiceFileName', 'clientType', 'value', 'numberOfUnits', 'unitPrice', 'clientStatus', 'nombreFiscal', 'cif', 'contactoNombre', 'contactoCorreo', 'contactoTelefono', 'observacionesAlta', 'notes', 'nextActionType', 'nextActionCustom', 'failureReasonType', 'failureReasonCustom', 'accountId'].includes(key)) {
        firestoreData[key] = null;
      }
    }
  });
  
  if (data.visitDate) {
    const dateValue = typeof data.visitDate === 'string' ? parseISO(data.visitDate) : data.visitDate;
    if (dateValue instanceof Date && isValid(dateValue)) {
      firestoreData.visitDate = Timestamp.fromDate(dateValue);
    }
  }
  if (data.nextActionDate) {
    const dateValue = typeof data.nextActionDate === 'string' ? parseISO(data.nextActionDate) : data.nextActionDate;
    if (dateValue instanceof Date && isValid(dateValue)) {
      firestoreData.nextActionDate = Timestamp.fromDate(dateValue);
    } else {
      firestoreData.nextActionDate = null;
    }
  }

  if (data.direccionFiscal_street && data.direccionFiscal_city && data.direccionFiscal_province && data.direccionFiscal_postalCode) {
    firestoreData.direccionFiscal = {
      street: data.direccionFiscal_street,
      number: data.direccionFiscal_number || undefined,
      city: data.direccionFiscal_city,
      province: data.direccionFiscal_province,
      postalCode: data.direccionFiscal_postalCode,
      country: data.direccionFiscal_country || "España",
    };
  } else if (data.direccionFiscal && typeof data.direccionFiscal === 'object') { 
    firestoreData.direccionFiscal = data.direccionFiscal;
  } else {
    firestoreData.direccionFiscal = null;
  }

  if (data.direccionEntrega_street && data.direccionEntrega_city && data.direccionEntrega_province && data.direccionEntrega_postalCode) {
    firestoreData.direccionEntrega = {
      street: data.direccionEntrega_street,
      number: data.direccionEntrega_number || undefined,
      city: data.direccionEntrega_city,
      province: data.direccionEntrega_province,
      postalCode: data.direccionEntrega_postalCode,
      country: data.direccionEntrega_country || "España",
    };
  } else if (data.direccionEntrega && typeof data.direccionEntrega === 'object') {
    firestoreData.direccionEntrega = data.direccionEntrega;
  } else {
    firestoreData.direccionEntrega = null;
  }


  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.lastUpdated = Timestamp.fromDate(new Date());

  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      firestoreData[key] = null;
    }
  });
  if (!firestoreData.assignedMaterials) firestoreData.assignedMaterials = [];
  if (!firestoreData.products) firestoreData.products = [];

  return firestoreData;
};


export const getOrdersFS = async (): Promise<Order[]> => {
  const ordersCol = collection(db, ORDERS_COLLECTION);
  const q = query(ordersCol, orderBy('createdAt', 'desc')); 
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

export const addOrderFS = async (data: Partial<Order> & {visitDate: Date | string, accountId?: string,
    direccionFiscal_street?: string, direccionFiscal_number?: string, direccionFiscal_city?: string, direccionFiscal_province?: string, direccionFiscal_postalCode?: string, direccionFiscal_country?: string,
    direccionEntrega_street?: string, direccionEntrega_number?: string, direccionEntrega_city?: string, direccionEntrega_province?: string, direccionEntrega_postalCode?: string, direccionEntrega_country?: string,
}): Promise<string> => {
  const firestoreData = toFirestoreOrder(data, true);
  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateOrderFS = async (id: string, data: Partial<Order> & {visitDate?: Date | string,
    direccionFiscal_street?: string, direccionFiscal_number?: string, direccionFiscal_city?: string, direccionFiscal_province?: string, direccionFiscal_postalCode?: string, direccionFiscal_country?: string,
    direccionEntrega_street?: string, direccionEntrega_number?: string, direccionEntrega_city?: string, direccionEntrega_province?: string, direccionEntrega_postalCode?: string, direccionEntrega_country?: string,
}): Promise<void> => { 
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  const firestoreData = toFirestoreOrder(data, false); 
  await updateDoc(orderDocRef, firestoreData);
};

export const deleteOrderFS = async (id: string): Promise<void> => {
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  await deleteDoc(orderDocRef);
};

export const initializeMockOrdersInFirestore = async (mockOrdersData: Order[]) => {
    const ordersCol = collection(db, ORDERS_COLLECTION);
    const snapshot = await getDocs(query(ordersCol));
    if (snapshot.empty) {
        const batch = writeBatch(db);
        mockOrdersData.forEach(order => {
            const { id, createdAt, visitDate, lastUpdated, nextActionDate, direccionFiscal, direccionEntrega, ...orderData } = order; 
            
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
            firestoreReadyData.paymentMethod = order.paymentMethod || null;
            firestoreReadyData.invoiceUrl = order.invoiceUrl || null;
            firestoreReadyData.invoiceFileName = order.invoiceFileName || null;

            firestoreReadyData.direccionFiscal = direccionFiscal || null; 
            firestoreReadyData.direccionEntrega = direccionEntrega || null; 
            
            Object.keys(firestoreReadyData).forEach(key => {
                if (firestoreReadyData[key] === undefined) {
                   firestoreReadyData[key] = null; 
                } else if (typeof firestoreReadyData[key] === 'string' && firestoreReadyData[key].trim() === '' && 
                           !['salesRep', 'clientName', 'status'].includes(key) ) { 
                   firestoreReadyData[key] = null;
                }
            });

            const docRef = doc(ordersCol); 
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock orders initialized in Firestore.');
    } else {
        console.log('Orders collection is not empty. Skipping initialization.');
    }
};
