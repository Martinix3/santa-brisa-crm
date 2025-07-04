

'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot, writeBatch,
} from "firebase/firestore";
import type { Order, AssignedPromotionalMaterial, AccountFormValues, NewScheduledTaskData, OrderStatus, TeamMember } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { updateInventoryItemStockFS } from './inventory-item-service';
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
    orderIndex: data.orderIndex ?? 0,
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
    'taskCategory', 'isCompleted', 'orderIndex'
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
  if (firestoreData.orderIndex === undefined) firestoreData.orderIndex = 0;

  return firestoreData;
};


export const getOrdersFS = async (): Promise<Order[]> => {
  const ordersCol = collection(db, ORDERS_COLLECTION);
  const q = query(ordersCol, orderBy('createdAt', 'desc')); 
  const orderSnapshot = await getDocs(q);
  const orderList = orderSnapshot.docs.map(docSnap => fromFirestoreOrder(docSnap));

  // Perform secondary sort by orderIndex in memory
  // This is a stable sort as long as the primary sort (by date) is consistent.
  // We sort primarily by date (desc) then by index (asc)
  orderList.sort((a, b) => {
    const dateA = parseISO(a.createdAt);
    const dateB = parseISO(b.createdAt);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }
    return (a.orderIndex || 0) - (b.orderIndex || 0);
  });
  
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
        await updateInventoryItemStockFS(item.materialId, -item.quantity);
    }
  }

  return docRef.id;
};

export const addScheduledTaskFS = async (data: NewScheduledTaskData, creator: TeamMember): Promise<string> => {
  let accountId = data.accountId;
  let clientName = data.newClientName;
  let assignedTo = creator;

  if (data.taskCategory === 'Commercial') {
      if (data.clientSelectionMode === 'existing') {
          const account = await getAccountByIdFS(data.accountId!);
          if (!account) throw new Error("Account not found");
          clientName = account.nombre;
      } else if (!clientName?.trim()) {
          throw new Error("El nombre del nuevo cliente es obligatorio para tareas comerciales.");
      }
  } else {
      clientName = data.notes.substring(0, 50) || "Tarea Administrativa"; 
      accountId = undefined;
  }
  
  if (data.assignedToId) {
    const assignedMember = await getTeamMemberByIdFS(data.assignedToId);
    if(assignedMember) assignedTo = assignedMember;
  }
  
  const orderData = {
    clientName: clientName,
    accountId: accountId || null,
    visitDate: Timestamp.fromDate(data.visitDate),
    createdAt: Timestamp.fromDate(new Date()),
    lastUpdated: Timestamp.fromDate(new Date()),
    salesRep: assignedTo.name,
    status: 'Programada' as OrderStatus,
    notes: data.notes,
    clientStatus: data.taskCategory === 'Commercial' ? (data.clientSelectionMode === 'new' ? 'new' : 'existing') : null,
    taskCategory: data.taskCategory || 'Commercial',
    isCompleted: false,
    orderIndex: 0,
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
      await updateInventoryItemStockFS(materialId, quantityChange);
    }
  }
};

export const updateScheduledTaskFS = async (taskId: string, data: NewScheduledTaskData): Promise<void> => {
  const taskDocRef = doc(db, ORDERS_COLLECTION, taskId);
  
  const updatePayload: { [key: string]: any } = {
    lastUpdated: Timestamp.fromDate(new Date())
  };

  if(data.notes) updatePayload.notes = data.notes;
  if(data.visitDate) updatePayload.visitDate = Timestamp.fromDate(data.visitDate);

  if (data.taskCategory === 'Commercial') {
      if (data.clientSelectionMode === 'new' && data.newClientName) {
        updatePayload.clientName = data.newClientName;
        updatePayload.accountId = null; // A new client name implies we detach from any old accountId
      } else if (data.clientSelectionMode === 'existing' && data.accountId) {
          const account = await getAccountByIdFS(data.accountId);
          if (account) {
            updatePayload.clientName = account.nombre;
            updatePayload.accountId = data.accountId;
          }
      }
  } else {
    // For admin tasks, client/account info is not relevant or derived from notes
    updatePayload.clientName = data.notes.substring(0, 50) || "Tarea Administrativa";
    updatePayload.accountId = null;
  }
  
  if (data.assignedToId) {
      const assignedMember = await getTeamMemberByIdFS(data.assignedToId);
      if (assignedMember) {
          updatePayload.salesRep = assignedMember.name;
      }
  }

  await updateDoc(taskDocRef, updatePayload);
};


export const deleteOrderFS = async (id: string): Promise<void> => {
  const orderDocRef = doc(db, ORDERS_COLLECTION, id);
  const existingOrderDoc = await getDoc(orderDocRef);

  if (existingOrderDoc.exists()) {
    const orderData = fromFirestoreOrder(existingOrderDoc);
    // Add stock back on deletion
    if (orderData.assignedMaterials && orderData.assignedMaterials.length > 0) {
      for (const item of orderData.assignedMaterials) {
        await updateInventoryItemStockFS(item.materialId, item.quantity);
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
            firestoreReadyData.orderIndex = order.orderIndex ?? 0;

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

export const reorderTasksBatchFS = async (
  updates: { id: string; orderIndex: number; date?: Date }[]
): Promise<void> => {
  if (!updates || updates.length === 0) {
    return;
  }
  const batch = writeBatch(db);

  // To avoid N+1 reads inside a loop, fetch all documents first.
  const docRefs = updates.map(u => doc(db, ORDERS_COLLECTION, u.id));
  const docSnapshots = await Promise.all(docRefs.map(ref => getDoc(ref)));

  updates.forEach((update, index) => {
    const docSnap = docSnapshots[index];
    if (!docSnap.exists()) {
      console.warn(`Task with ID ${update.id} not found during batch update. Skipping.`);
      return;
    }

    const ref = doc(db, ORDERS_COLLECTION, update.id);
    const payload: any = {
      orderIndex: update.orderIndex,
      lastUpdated: Timestamp.now()
    };

    if (update.date) {
      const taskData = docSnap.data();
      // Logic to determine which date field to update
      if (taskData.status === 'Programada') {
        payload.visitDate = Timestamp.fromDate(update.date);
      } else if (taskData.status === 'Seguimiento') {
        payload.nextActionDate = Timestamp.fromDate(update.date);
      }
    }
    batch.update(ref, payload);
  });

  try {
    await batch.commit();
    console.log(`Batch reorder complete for ${updates.length} tasks.`);
  } catch (error) {
    console.error('Error committing batch reorder for tasks:', error);
    throw error;
  }
};
    




