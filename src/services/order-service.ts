

"use client"; // This service is used by client components, so it must be marked as client-compatible.

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot, writeBatch, runTransaction, where,
} from "firebase/firestore";
import type { Order, Account, TeamMember, OrderStatus, NewScheduledTaskData } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const ORDERS_COLLECTION = 'orders'; 

const fromFirestoreOrder = (docSnap: DocumentSnapshot): Order => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  const toDateString = (ts: any, defaultNow = true): string | undefined => {
      if (!ts) return defaultNow ? new Date().toISOString() : undefined;
      if (ts instanceof Timestamp) return ts.toDate().toISOString();
      if (typeof ts === 'string') return ts;
      if (typeof ts === 'object' && ts.seconds) return new Timestamp(ts.seconds, ts.nanoseconds).toDate().toISOString();
      const directParsed = new Date(ts);
      if(isValid(directParsed)) return directParsed.toISOString();
      return defaultNow ? new Date().toISOString() : undefined;
  };

  return {
    id: docSnap.id,
    clientName: data.clientName,
    visitDate: toDateString(data.visitDate, false), // visitDate is not always present
    products: data.products,
    value: data.value,
    status: data.status,
    salesRep: data.salesRep,
    lastUpdated: toDateString(data.lastUpdated)!, 
    distributorId: data.distributorId,
    clavadistaId: data.clavadistaId,
    assignedMaterials: data.assignedMaterials,
    canalOrigenColocacion: data.canalOrigenColocacion,
    paymentMethod: data.paymentMethod,
    iban: data.iban,
    invoiceUrl: data.invoiceUrl,
    invoiceFileName: data.invoiceFileName,

    clientType: data.clientType,
    numberOfUnits: data.numberOfUnits,
    unitPrice: data.unitPrice,
    clientStatus: data.clientStatus,
    notes: data.notes,
    nextActionType: data.nextActionType,
    nextActionCustom: data.nextActionCustom,
    nextActionDate: toDateString(data.nextActionDate, false),
    failureReasonType: data.failureReasonType,
    failureReasonCustom: data.failureReasonCustom,
    accountId: data.accountId,
    createdAt: toDateString(data.createdAt)!,
    originatingTaskId: data.originatingTaskId,
    taskCategory: data.taskCategory || 'Commercial',
    isCompleted: !!data.isCompleted,
    orderIndex: data.orderIndex ?? 0,
    costOfGoods: data.costOfGoods,
    paidStatus: data.paidStatus,
    embajadorId: data.embajadorId,
    comision: data.comision,
    bonus: data.bonus,
    es_segundo_pedido: data.es_segundo_pedido,
    liberado_para_pago: data.liberado_para_pago,
    cif: data.cif,
    saleType: data.saleType,
  };
};

export const getOrdersFS = async (): Promise<Order[]> => {
  const ordersCol = collection(db, ORDERS_COLLECTION);
  const q = query(ordersCol, orderBy('createdAt', 'desc'));
  const salesSnapshot = await getDocs(q);
  return salesSnapshot.docs.map(docSnap => fromFirestoreOrder(docSnap));
};

export const getInteractionsForAccountFS = async (accountId: string, accountName: string): Promise<Order[]> => {
    if (!accountId && !accountName) return [];
    
    // Create queries for both accountId and clientName if they exist
    const queries = [];
    if (accountId) {
      queries.push(query(collection(db, ORDERS_COLLECTION), where("accountId", "==", accountId)));
    }
    if (accountName) {
      queries.push(query(collection(db, ORDERS_COLLECTION), where("clientName", "==", accountName)));
    }

    if (queries.length === 0) return [];

    const snapshots = await Promise.all(queries.map(q => getDocs(q)));

    const allInteractions = new Map<string, Order>();
    snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
            if (!allInteractions.has(doc.id)) {
                allInteractions.set(doc.id, fromFirestoreOrder(doc));
            }
        });
    });

    return Array.from(allInteractions.values());
};

export const getOrderByIdFS = async (id: string): Promise<Order | null> => {
    if (!id) return null;
    const docRef = doc(db, ORDERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? fromFirestoreOrder(docSnap) : null;
};


export const addOrderFS = async (data: Partial<Order>): Promise<string> => {
  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), { ...data, createdAt: Timestamp.now(), lastUpdated: Timestamp.now() });
  return docRef.id;
};


export const updateFullOrderFS = async (id: string, data: Partial<Order>): Promise<void> => {
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  const dataToUpdate: { [key: string]: any } = { ...data };
  dataToUpdate.lastUpdated = Timestamp.now();
  await updateDoc(orderDocRef, dataToUpdate);
};

export const deleteOrderFS = async (id: string): Promise<void> => {
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  await deleteDoc(orderDocRef);
};

export const addScheduledTaskFS = async (data: NewScheduledTaskData, currentUser: TeamMember): Promise<string> => {
    const dataToSave: Partial<Order> = {
        status: 'Programada',
        visitDate: data.visitDate.toISOString(),
        notes: data.notes,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        clientName: data.newClientName || 'Tarea Administrativa',
        accountId: data.accountId,
        salesRep: currentUser.name,
        taskCategory: data.taskCategory,
        isCompleted: false,
        orderIndex: 0,
    };
    if(currentUser.role === 'Clavadista') {
      dataToSave.clavadistaId = currentUser.id;
    }
    return addOrderFS(dataToSave);
};

export const updateScheduledTaskFS = async (id: string, data: NewScheduledTaskData): Promise<void> => {
    const dataToUpdate: Partial<Order> = {
        visitDate: data.visitDate.toISOString(),
        notes: data.notes,
        clientName: data.newClientName,
        accountId: data.accountId,
    };
    await updateFullOrderFS(id, dataToUpdate);
};

export const reorderTasksBatchFS = async (updates: { id: string; orderIndex: number, date?: Date }[]): Promise<void> => {
    const batch = writeBatch(db);
    updates.forEach(update => {
        const docRef = doc(db, ORDERS_COLLECTION, update.id);
        const payload: any = { orderIndex: update.orderIndex, updatedAt: Timestamp.now() };
        if(update.date) {
            payload.visitDate = Timestamp.fromDate(update.date);
            payload.nextActionDate = Timestamp.fromDate(update.date);
        }
        batch.update(docRef, payload);
    });
    await batch.commit();
};

export const updateOrderStatusFS = async (id: string, status: OrderStatus): Promise<void> => {
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  await updateDoc(orderDocRef, {
    status,
    lastUpdated: Timestamp.now(),
  });
};
