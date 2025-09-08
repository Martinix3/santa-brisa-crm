import { db, adminDb } from '@/lib/firebaseAdmin';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot, writeBatch, runTransaction, where,
  increment,
} from "firebase-admin/firestore";
import type { CrmEvent, EventFormValues, InventoryItem, Category } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { getInventoryItemByIdFS } from './inventory-item-service';

const EVENTS_COLLECTION = 'events';
const PURCHASES_COLLECTION = 'purchases';

export const fromFirestoreEvent = (docSnap: DocumentSnapshot): CrmEvent => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");
  return {
    id: docSnap.id,
    name: data.name || '',
    type: data.type || 'Otro',
    status: data.status || 'Planificado',
    startDate: data.startDate instanceof Timestamp ? format(data.startDate.toDate(), "yyyy-MM-dd") : (typeof data.startDate === 'string' ? data.startDate : format(new Date(), "yyyy-MM-dd")),
    endDate: data.endDate instanceof Timestamp ? format(data.endDate.toDate(), "yyyy-MM-dd") : (typeof data.endDate === 'string' ? data.endDate : undefined),
    description: data.description || '',
    location: data.location || '',
    assignedTeamMemberIds: data.assignedTeamMemberIds || [],
    assignedMaterials: data.assignedMaterials || [],
    notes: data.notes || '',
    createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : format(new Date(), "yyyy-MM-dd")),
    updatedAt: data.updatedAt instanceof Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : (typeof data.updatedAt === 'string' ? data.updatedAt : format(new Date(), "yyyy-MM-dd")),
    orderIndex: data.orderIndex ?? 0,
    budget: data.budget,
    currency: data.currency,
    isCashflowForecast: data.isCashflowForecast,
    salesTarget: data.salesTarget,
    salesActual: data.salesActual,
    accountId: data.accountId,
    accountName: data.accountName,
    costCenterId: data.costCenterId,
  };
};

const toFirestoreEvent = (data: EventFormValues, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    type: data.type,
    status: data.status,
    startDate: data.startDate instanceof Date && isValid(data.startDate) ? Timestamp.fromDate(data.startDate) : Timestamp.fromDate(new Date()),
    endDate: data.endDate instanceof Date && isValid(data.endDate) ? Timestamp.fromDate(data.endDate) : null,
    description: data.description || null,
    location: data.location || null,
    assignedTeamMemberIds: data.assignedTeamMemberIds || [],
    assignedMaterials: data.assignedMaterials || [],
    notes: data.notes || null,
    orderIndex: data.orderIndex ?? 0,
    budget: data.budget ?? null,
    currency: data.currency || null,
    isCashflowForecast: data.isCashflowForecast || false,
    salesTarget: data.salesTarget ?? null,
    salesActual: data.salesActual ?? null,
    accountId: data.accountId || null,
    accountName: data.accountName || null,
    costCenterId: data.costCenterId || null,
  };

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
    firestoreData.orderIndex = 0;
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());

  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      if (['description', 'location', 'notes', 'endDate', 'budget', 'currency', 'salesTarget', 'salesActual', 'accountId', 'accountName', 'costCenterId'].includes(key)) {
        firestoreData[key] = null;
      } else if (!['assignedTeamMemberIds', 'assignedMaterials', 'isCashflowForecast'].includes(key)) {
        delete firestoreData[key];
      }
    }
  });

  return firestoreData;
};

export const getEventsFS = async (): Promise<CrmEvent[]> => {
  const eventsCol = adminDb.collection(EVENTS_COLLECTION);
  const q = eventsCol.orderBy('startDate', 'desc');
  const eventSnapshot = await q.get();
  const eventList = eventSnapshot.docs.map(docSnap => fromFirestoreEvent(docSnap));

  eventList.sort((a, b) => {
    const dateA = parseISO(a.startDate);
    const dateB = parseISO(b.startDate);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }
    return (a.orderIndex || 0) - (b.orderIndex || 0);
  });
  
  return eventList;
};

export const getEventsForAccountFS = async (accountId: string): Promise<CrmEvent[]> => {
    if (!accountId) return [];
    const q = adminDb.collection(EVENTS_COLLECTION).where("accountId", "==", accountId).orderBy('startDate', 'desc');
    const snapshot = await q.get();
    const events = snapshot.docs.map(fromFirestoreEvent);
    
    events.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    return events;
};

export const getEventByIdFS = async (id: string): Promise<CrmEvent | null> => {
  if (!id) return null;
  const eventDocRef = adminDb.collection(EVENTS_COLLECTION).doc(id);
  const docSnap = await docRef.get();
  return docSnap.exists ? fromFirestoreEvent(docSnap) : null;
};

const updateStockAndCreateExpenseForMaterials = async (
  materials: { materialId: string; quantity: number }[],
  referenceText: string,
  marketingCategoryId: string,
  isRemoval: boolean = false
) => {
  if (!materials || materials.length === 0) return;

  const batch = adminDb.batch();
  let totalCost = 0;

  for (const item of materials) {
    const materialDoc = await getInventoryItemByIdFS(item.materialId);
    if (!materialDoc) {
      console.warn(`Material with ID ${item.materialId} not found. Skipping stock update.`);
      continue;
    }

    const materialRef = adminDb.collection('inventoryItems').doc(item.materialId);
    const change = isRemoval ? item.quantity : -item.quantity;
    batch.update(materialRef, { stock: increment(change) });
    
    totalCost += (materialDoc.latestPurchase?.calculatedUnitCost || 0) * item.quantity;
  }
  
  if (totalCost > 0) {
    const expenseData = {
      concepto: referenceText,
      categoriaId: marketingCategoryId,
      isInventoryPurchase: false,
      estadoDocumento: 'factura_validada',
      estadoPago: 'pagado',
      monto: totalCost,
      moneda: 'EUR',
      fechaEmision: Timestamp.now(),
      creadoPor: 'system_auto',
      fechaCreacion: Timestamp.now(),
    };
    const newExpenseRef = adminDb.collection(PURCHASES_COLLECTION).doc();
    batch.set(newExpenseRef, expenseData);
  }

  await batch.commit();
};

export const addEventFS = async (data: EventFormValues): Promise<string> => {
  const firestoreData = toFirestoreEvent(data, true);
  const docRef = await addDoc(collection(adminDb, EVENTS_COLLECTION), firestoreData);
  
  const mktCatQuery = adminDb.collection('categories').where('name', '==', 'Ventas & Marketing');
  const mktCatSnapshot = await mktCatQuery.get();
  const marketingCategoryId = mktCatSnapshot.empty ? 'MKT' : mktCatSnapshot.docs[0].id;

  if (data.assignedMaterials && data.assignedMaterials.length > 0) {
    await updateStockAndCreateExpenseForMaterials(data.assignedMaterials, `Consumo PLV para Evento: ${data.name}`, marketingCategoryId);
  }

  return docRef.id;
};

export const updateEventFS = async (id: string, data: EventFormValues): Promise<void> => {
  const eventDocRef = adminDb.collection(EVENTS_COLLECTION).doc(id);
  const existingEventDoc = await getDoc(eventDocRef);
  if (!existingEventDoc.exists()) throw new Error("Event not found to update");
  const oldData = fromFirestoreEvent(existingEventDoc);

  const firestoreData = toFirestoreEvent(data, false);
  await updateDoc(eventDocRef, firestoreData);

  const mktCatQuery = adminDb.collection('categories').where('name', '==', 'Ventas & Marketing');
  const mktCatSnapshot = await mktCatQuery.get();
  const marketingCategoryId = mktCatSnapshot.empty ? 'MKT' : mktCatSnapshot.docs[0].id;

  const stockChanges = new Map<string, number>();
  const oldMaterials = oldData.assignedMaterials || [];
  const newMaterials = data.assignedMaterials || [];

  for (const oldItem of oldMaterials) {
    if (oldItem.materialId && oldItem.quantity > 0) {
      stockChanges.set(oldItem.materialId, (stockChanges.get(oldItem.materialId) || 0) + oldItem.quantity);
    }
  }
  for (const newItem of newMaterials) {
    if (newItem.materialId && newItem.quantity > 0) {
      stockChanges.set(newItem.materialId, (stockChanges.get(newItem.materialId) || 0) - newItem.quantity);
    }
  }

  const materialsToExpense: { materialId: string; quantity: number }[] = [];
  const materialsToReturn: { materialId: string; quantity: number }[] = [];

  for (const [materialId, quantityChange] of stockChanges.entries()) {
    if (quantityChange < 0) { // New materials were added or quantity increased
      materialsToExpense.push({ materialId, quantity: -quantityChange });
    } else if (quantityChange > 0) { // Materials were removed or quantity decreased
      materialsToReturn.push({ materialId, quantity: quantityChange });
    }
  }
  
  if (materialsToExpense.length > 0) {
    await updateStockAndCreateExpenseForMaterials(materialsToExpense, `Ajuste PLV para Evento: ${data.name}`, marketingCategoryId, false);
  }
  if (materialsToReturn.length > 0) {
    await updateStockAndCreateExpenseForMaterials(materialsToReturn, `Devolución PLV de Evento: ${data.name}`, marketingCategoryId, true);
  }
};

export const deleteEventFS = async (id: string): Promise<void> => {
  const eventDocRef = adminDb.collection(EVENTS_COLLECTION).doc(id);
  const existingEventDoc = await getDoc(eventDocRef);

  if (existingEventDoc.exists()) {
    const eventData = fromFirestoreEvent(existingEventDoc);
    if (eventData.assignedMaterials && eventData.assignedMaterials.length > 0) {
      const mktCatQuery = adminDb.collection('categories').where('name', '==', 'Ventas & Marketing');
      const mktCatSnapshot = await mktCatQuery.get();
      const marketingCategoryId = mktCatSnapshot.empty ? 'MKT' : mktCatSnapshot.docs[0].id;
      await updateStockAndCreateExpenseForMaterials(eventData.assignedMaterials, `Cancelación/Devolución PLV Evento: ${eventData.name}`, marketingCategoryId, true);
    }
  }
  await deleteDoc(eventDocRef);
};

export const initializeMockEventsInFirestore = async (mockEventsData: CrmEvent[]) => {
    const eventsCol = adminDb.collection(EVENTS_COLLECTION);
    const snapshot = await eventsCol.limit(1).get();
    if (snapshot.empty && mockEventsData.length > 0) {
        for(const event of mockEventsData) {
            const { id, createdAt, updatedAt, startDate, endDate, ...eventData } = event;
            
            const firestoreReadyData: any = { ...eventData };
            firestoreReadyData.startDate = startDate ? Timestamp.fromDate(parseISO(startDate)) : Timestamp.fromDate(new Date());
            firestoreReadyData.endDate = endDate ? Timestamp.fromDate(parseISO(endDate)) : null;
            firestoreReadyData.createdAt = createdAt ? Timestamp.fromDate(parseISO(createdAt)) : Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? Timestamp.fromDate(parseISO(updatedAt)) : Timestamp.fromDate(new Date());
            firestoreReadyData.assignedTeamMemberIds = event.assignedTeamMemberIds || [];
            firestoreReadyData.assignedMaterials = event.assignedMaterials || [];
            firestoreReadyData.orderIndex = event.orderIndex ?? 0;
            
            firestoreReadyData.description = event.description || null;
            firestoreReadyData.location = event.location || null;
            firestoreReadyData.notes = event.notes || null;
            
            await addDoc(eventsCol, firestoreReadyData);
        }
        console.log('Mock events initialized in Firestore.');
    } else if (mockEventsData.length === 0) {
        console.log('No mock events to seed.');
    } else {
        console.log('Events collection is not empty. Skipping initialization.');
    }
};

export const reorderEventsBatchFS = async (
  updates: { id: string; orderIndex: number; date?: Date }[]
): Promise<void> => {
  if (!updates || updates.length === 0) {
    return;
  }
  const batch = adminDb.batch();
  
  const docRefs = updates.map(u => adminDb.collection(EVENTS_COLLECTION).doc(u.id));
  const docSnapshots = await adminDb.getAll(...docRefs);
  
  updates.forEach((update, index) => {
    const docSnap = docSnapshots[index];
    if (!docSnap.exists) {
      console.warn(`Event with ID ${update.id} not found during batch update. Skipping.`);
      return;
    }

    const ref = adminDb.collection(EVENTS_COLLECTION).doc(update.id);
    const payload: any = { 
      orderIndex: update.orderIndex, 
      updatedAt: Timestamp.now() 
    };

    if (update.date) {
        payload.startDate = Timestamp.fromDate(update.date);
        const eventData = docSnap.data();
        if(eventData && eventData.endDate && eventData.startDate) {
            const duration = eventData.endDate.toDate().getTime() - eventData.startDate.toDate().getTime();
            if (duration >= 0) { 
              payload.endDate = Timestamp.fromMillis(update.date.getTime() + duration);
            }
        }
    }
    batch.update(ref, payload);
  });
  
  try {
    await batch.commit();
    console.log(`Batch reorder complete for ${updates.length} events.`);
  } catch (error) {
    console.error('Error committing batch reorder for events:', error);
    throw error;
  }
};
