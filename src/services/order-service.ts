

'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot,
} from "firebase/firestore";
import type { Order, AssignedPromotionalMaterial, AccountFormValues, NewScheduledTaskData, OrderStatus, TeamMember } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { updateMaterialStockFS } from './promotional-material-service';
import { getAccountByIdFS, addAccountFS } from './account-service';
import { getTeamMemberByIdFS } from './team-member-service';


const ORDERS_COLLECTION = 'orders';

const fromFirestoreOrder = (docSnap: DocumentSnapshot): Order => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  const parseOptionalDate = (dateField: any): string | undefined => {
      if (!dateField) return undefined;
      if (dateField instanceof Timestamp) return format(dateField.toDate(), "yyyy-MM-dd");
      if (typeof dateField === 'string' && isValid(parseISO(dateField))) return dateField;
      return undefined;
  };
  
  const parseRequiredDate = (dateField: any, formatStr: string = "yyyy-MM-dd HH:mm:ss"): string => {
      if(!dateField) return format(new Date(), formatStr);
      if(dateField instanceof Timestamp) return format(dateField.toDate(), formatStr);
      if(typeof dateField === 'string' && isValid(parseISO(dateField))) return dateField;
      return format(new Date(), formatStr);
  };

  const order: Order = {
    id: docSnap.id,
    clientName: data.clientName || '',
    visitDate: parseOptionalDate(data.visitDate),
    products: data.products || [],
    value: data.value,
    status: data.status || 'Pendiente',
    salesRep: data.salesRep || '',
    lastUpdated: parseRequiredDate(data.lastUpdated),
    clavadistaId: data.clavadistaId || undefined, 
    assignedMaterials: data.assignedMaterials || [],
    canalOrigenColocacion: data.canalOrigenColocacion || undefined,
    paymentMethod: data.paymentMethod || undefined,
    iban: data.iban || undefined,
    invoiceUrl: data.invoiceUrl || undefined,
    invoiceFileName: data.invoiceFileName || undefined,

    clientType: data.clientType,
    numberOfUnits: data.numberOfUnits, 
    unitPrice: data.unitPrice, 
    clientStatus: data.clientStatus,
    
    notes: data.notes || '',

    nextActionType: data.nextActionType,
    nextActionCustom: data.nextActionCustom || '',
    nextActionDate: parseOptionalDate(data.nextActionDate),
    failureReasonType: data.failureReasonType,
    failureReasonCustom: data.failureReasonCustom || '',
    
    accountId: data.accountId || undefined,
    createdAt: parseRequiredDate(data.createdAt),
    originatingTaskId: data.originatingTaskId || undefined,
    taskCategory: data.taskCategory || 'Commercial',
    isCompleted: data.isCompleted || false,
  };
  return order;
};

const toFirestoreOrder = (data: Partial<Order> & { visitDate?: Date | string, nextActionDate?: Date | string, accountId?: string }, isNew: boolean): any => {
  
  const firestoreData: { [key: string]: any } = {};

  const directOrderKeys: (keyof Order)[] = [
    'clientName', 'products', 'value', 'status', 'salesRep', 'clavadistaId', 
    'assignedMaterials', 'canalOrigenColocacion', 'paymentMethod', 'iban', 'invoiceUrl', 'invoiceFileName', 
    'clientType', 'numberOfUnits', 'unitPrice', 'clientStatus', 
    'notes', 'nextActionType', 'nextActionCustom', 'failureReasonType', 
    'failureReasonCustom', 'accountId', 'originatingTaskId',
    'taskCategory', 'isCompleted'
  ];

  directOrderKeys.forEach(key => {
    if (data[key] !== undefined) {
      firestoreData[key] = data[key];
    } else {
      if (['clavadistaId', 'canalOrigenColocacion', 'paymentMethod', 'iban', 'invoiceUrl', 'invoiceFileName', 'clientType', 'value', 'numberOfUnits', 'unitPrice', 'clientStatus', 'notes', 'nextActionType', 'nextActionCustom', 'failureReasonType', 'failureReasonCustom', 'accountId', 'originatingTaskId'].includes(key)) {
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
  if (!firestoreData.taskCategory) firestoreData.taskCategory = 'Commercial';
  if (firestoreData.isCompleted === undefined) firestoreData.isCompleted = false;

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

export const addOrderFS = async (data: Partial<Order> & {visitDate: Date | string, accountId?: string}): Promise<string> => {
  const firestoreData = toFirestoreOrder(data, true);
  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), firestoreData);
  
  // Deduct stock for assigned materials
  if (data.assignedMaterials && data.assignedMaterials.length > 0) {
    for (const item of data.assignedMaterials) {
        await updateMaterialStockFS(item.materialId, -item.quantity);
    }
  }

  return docRef.id;
};

export const addScheduledTaskFS = async (data: NewScheduledTaskData, creator: TeamMember): Promise<string> => {
  let accountId = data.accountId;
  let clientName = data.newClientName;
  let assignedTo = creator;

  if (data.clientSelectionMode === 'existing') {
    const account = await getAccountByIdFS(data.accountId!);
    if (!account) throw new Error("Account not found");
    clientName = account.nombre;
  }
  
  if (data.assignedToId) {
    const assignedMember = await getTeamMemberByIdFS(data.assignedToId);
    if(assignedMember) assignedTo = assignedMember;
  }
  
  const orderData = {
    clientName: clientName!,
    accountId: accountId || null,
    visitDate: Timestamp.fromDate(data.visitDate),
    createdAt: Timestamp.fromDate(new Date()),
    lastUpdated: Timestamp.fromDate(new Date()),
    salesRep: assignedTo.name,
    status: 'Programada' as OrderStatus,
    notes: data.notes,
    clientStatus: data.clientSelectionMode === 'new' ? 'new' : 'existing',
    taskCategory: 'Commercial',
    isCompleted: false,
  };
  
  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderData);
  return docRef.id;
}


export const updateOrderFS = async (id: string, data: Partial<Order> & {visitDate?: Date | string}): Promise<void> => { 
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  const existingOrderDoc = await getDoc(orderDocRef);
  if (!existingOrderDoc.exists()) throw new Error("Order not found to update stock");
  const oldData = fromFirestoreOrder(existingOrderDoc);
  
  const firestoreData = toFirestoreOrder(data, false); 
  await updateDoc(orderDocRef, firestoreData);

  // Calculate stock difference and update
  const stockChanges = new Map<string, number>();
  const oldMaterials = oldData.assignedMaterials || [];
  const newMaterials = data.assignedMaterials || [];

  // Add new quantities to be deducted
  for (const newItem of newMaterials) {
    stockChanges.set(newItem.materialId, (stockChanges.get(newItem.materialId) || 0) - newItem.quantity);
  }
  // Add old quantities back to stock
  for (const oldItem of oldMaterials) {
    stockChanges.set(oldItem.materialId, (stockChanges.get(oldItem.materialId) || 0) + oldItem.quantity);
  }
  // Apply the net changes
  for (const [materialId, quantityChange] of stockChanges.entries()) {
    if (quantityChange !== 0) {
      await updateMaterialStockFS(materialId, quantityChange);
    }
  }
};

export const deleteOrderFS = async (id: string): Promise<void> => {
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  const existingOrderDoc = await getDoc(orderDocRef);

  if (existingOrderDoc.exists()) {
    const orderData = fromFirestoreOrder(existingOrderDoc);
    // Add stock back on deletion
    if (orderData.assignedMaterials && orderData.assignedMaterials.length > 0) {
      for (const item of orderData.assignedMaterials) {
        await updateMaterialStockFS(item.materialId, item.quantity);
      }
    }
  }
  
  await deleteDoc(orderDocRef);
};

export const initializeMockOrdersInFirestore = async (mockOrdersData: Order[]) => {
    const ordersCol = collection(db, ORDERS_COLLECTION);
    const snapshot = await getDocs(query(ordersCol, orderBy('createdAt', 'desc')));
    if (snapshot.empty) {
        for(const order of mockOrdersData) {
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
            firestoreReadyData.paymentMethod = order.paymentMethod || null;
            firestoreReadyData.iban = order.iban || null;
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
            await addDoc(ordersCol, firestoreReadyData);
        };
        console.log('Mock orders initialized in Firestore.');
    } else {
        console.log('Orders collection is not empty. Skipping initialization.');
    }
};

    