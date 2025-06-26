
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import * as adminFirestore from 'firebase-admin/firestore';
import type { Order, OrderFormValues, CanalOrigenColocacion, AddressDetails, PaymentMethod } from '@/types'; 
import { format, parseISO, isValid } from 'date-fns';

const ORDERS_COLLECTION = 'orders';

const fromFirestoreOrder = (docSnap: adminFirestore.DocumentSnapshot<adminFirestore.DocumentData>): Order => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  const order: Order = {
    id: docSnap.id,
    clientName: data.clientName || '',
    visitDate: data.visitDate instanceof adminFirestore.Timestamp ? format(data.visitDate.toDate(), "yyyy-MM-dd") : (typeof data.visitDate === 'string' ? data.visitDate : format(new Date(), "yyyy-MM-dd")),
    products: data.products || [],
    value: data.value,
    status: data.status || 'Pendiente',
    salesRep: data.salesRep || '',
    lastUpdated: data.lastUpdated instanceof adminFirestore.Timestamp ? format(data.lastUpdated.toDate(), "yyyy-MM-dd") : (typeof data.lastUpdated === 'string' ? data.lastUpdated : format(new Date(), "yyyy-MM-dd")),
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
    
    notes: data.notes || '',

    nextActionType: data.nextActionType,
    nextActionCustom: data.nextActionCustom || '',
    nextActionDate: data.nextActionDate instanceof adminFirestore.Timestamp ? format(data.nextActionDate.toDate(), "yyyy-MM-dd") : (typeof data.nextActionDate === 'string' ? data.nextActionDate : undefined),
    failureReasonType: data.failureReasonType,
    failureReasonCustom: data.failureReasonCustom || '',
    
    accountId: data.accountId || undefined,
    createdAt: data.createdAt instanceof adminFirestore.Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd HH:mm:ss") : (typeof data.createdAt === 'string' ? data.createdAt : format(new Date(), "yyyy-MM-dd HH:mm:ss")),
    originatingTaskId: data.originatingTaskId || undefined,
  };
  return order;
};

const toFirestoreOrder = (data: Partial<Order> & { visitDate?: Date | string, nextActionDate?: Date | string, accountId?: string }, isNew: boolean): any => {
  
  const firestoreData: { [key: string]: any } = {};

  const directOrderKeys: (keyof Order)[] = [
    'clientName', 'products', 'value', 'status', 'salesRep', 'clavadistaId', 
    'assignedMaterials', 'canalOrigenColocacion', 'paymentMethod', 'invoiceUrl', 'invoiceFileName', 
    'clientType', 'numberOfUnits', 'unitPrice', 'clientStatus', 
    'notes', 'nextActionType', 'nextActionCustom', 'failureReasonType', 
    'failureReasonCustom', 'accountId', 'originatingTaskId'
  ];

  directOrderKeys.forEach(key => {
    if (data[key] !== undefined) {
      firestoreData[key] = data[key];
    } else {
      if (['clavadistaId', 'canalOrigenColocacion', 'paymentMethod', 'invoiceUrl', 'invoiceFileName', 'clientType', 'value', 'numberOfUnits', 'unitPrice', 'clientStatus', 'notes', 'nextActionType', 'nextActionCustom', 'failureReasonType', 'failureReasonCustom', 'accountId', 'originatingTaskId'].includes(key)) {
        firestoreData[key] = null;
      }
    }
  });
  
  if (data.visitDate) {
    const dateValue = typeof data.visitDate === 'string' ? parseISO(data.visitDate) : data.visitDate;
    if (dateValue instanceof Date && isValid(dateValue)) {
      firestoreData.visitDate = adminFirestore.Timestamp.fromDate(dateValue);
    }
  }
  if (data.nextActionDate) {
    const dateValue = typeof data.nextActionDate === 'string' ? parseISO(data.nextActionDate) : data.nextActionDate;
    if (dateValue instanceof Date && isValid(dateValue)) {
      firestoreData.nextActionDate = adminFirestore.Timestamp.fromDate(dateValue);
    } else {
      firestoreData.nextActionDate = null;
    }
  }

  if (isNew) {
    firestoreData.createdAt = adminFirestore.Timestamp.fromDate(new Date());
  }
  firestoreData.lastUpdated = adminFirestore.Timestamp.fromDate(new Date());

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
  const ordersCol = adminFirestore.collection(db, ORDERS_COLLECTION);
  const q = adminFirestore.query(ordersCol, adminFirestore.orderBy('createdAt', 'desc')); 
  const orderSnapshot = await adminFirestore.getDocs(q);
  const orderList = orderSnapshot.docs.map(docSnap => fromFirestoreOrder(docSnap));
  return orderList;
};

export const getOrderByIdFS = async (id: string): Promise<Order | null> => {
  if (!id) {
    console.warn("getOrderByIdFS called with no ID.");
    return null;
  }
  const orderDocRef = adminFirestore.doc(db, ORDERS_COLLECTION, id);
  const docSnap = await adminFirestore.getDoc(orderDocRef);
  if (docSnap.exists) {
    return fromFirestoreOrder(docSnap);
  } else {
    console.warn(`Order with ID ${id} not found in Firestore.`);
    return null;
  }
};

export const addOrderFS = async (data: Partial<Order> & {visitDate: Date | string, accountId?: string}): Promise<string> => {
  const firestoreData = toFirestoreOrder(data, true);
  const docRef = await adminFirestore.addDoc(adminFirestore.collection(db, ORDERS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateOrderFS = async (id: string, data: Partial<Order> & {visitDate?: Date | string}): Promise<void> => { 
  const orderDocRef = adminFirestore.doc(db, ORDERS_COLLECTION, id);
  const firestoreData = toFirestoreOrder(data, false); 
  await adminFirestore.updateDoc(orderDocRef, firestoreData);
};

export const deleteOrderFS = async (id: string): Promise<void> => {
  const orderDocRef = adminFirestore.doc(db, ORDERS_COLLECTION, id);
  await adminFirestore.deleteDoc(orderDocRef);
};

export const initializeMockOrdersInFirestore = async (mockOrdersData: Order[]) => {
    const ordersCol = adminFirestore.collection(db, ORDERS_COLLECTION);
    const snapshot = await adminFirestore.getDocs(adminFirestore.query(ordersCol));
    if (snapshot.empty) {
        const batch = adminFirestore.writeBatch(db);
        mockOrdersData.forEach(order => {
            const { id, createdAt, visitDate, lastUpdated, nextActionDate, ...orderData } = order; 
            
            const firestoreReadyData: any = { ...orderData };

            if (visitDate) firestoreReadyData.visitDate = adminFirestore.Timestamp.fromDate(parseISO(visitDate));
            firestoreReadyData.lastUpdated = lastUpdated ? adminFirestore.Timestamp.fromDate(parseISO(lastUpdated)) : adminFirestore.Timestamp.fromDate(new Date());
            firestoreReadyData.createdAt = createdAt ? adminFirestore.Timestamp.fromDate(parseISO(createdAt)) : adminFirestore.Timestamp.fromDate(new Date());
            if (nextActionDate) firestoreReadyData.nextActionDate = adminFirestore.Timestamp.fromDate(parseISO(nextActionDate));
            else firestoreReadyData.nextActionDate = null;

            firestoreReadyData.clavadistaId = order.clavadistaId || null;
            firestoreReadyData.accountId = order.accountId || null;
            firestoreReadyData.assignedMaterials = order.assignedMaterials || [];
            firestoreReadyData.canalOrigenColocacion = order.canalOrigenColocacion || null;
            firestoreReadyData.paymentMethod = order.paymentMethod || null;
            firestoreReadyData.invoiceUrl = order.invoiceUrl || null;
            firestoreReadyData.invoiceFileName = order.invoiceFileName || null;
            firestoreReadyData.originatingTaskId = order.originatingTaskId || null;
            
            Object.keys(firestoreReadyData).forEach(key => {
                if (firestoreReadyData[key] === undefined) {
                   firestoreReadyData[key] = null; 
                } else if (typeof firestoreReadyData[key] === 'string' && firestoreReadyData[key].trim() === '' && 
                           !['salesRep', 'clientName', 'status'].includes(key) ) { 
                   firestoreReadyData[key] = null;
                }
            });

            const docRef = adminFirestore.doc(ordersCol); 
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock orders initialized in Firestore.');
    } else {
        console.log('Orders collection is not empty. Skipping initialization.');
    }
};
