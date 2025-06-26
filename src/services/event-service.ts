

'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot,
} from "firebase/firestore";
import type { CrmEvent, EventFormValues } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const EVENTS_COLLECTION = 'events';

const fromFirestoreEvent = (docSnap: DocumentSnapshot): CrmEvent => {
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
  };

  if (isNew) {
    firestoreData.createdAt = Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = Timestamp.fromDate(new Date());

  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined || firestoreData[key] === '') {
      if (['description', 'location', 'notes', 'endDate'].includes(key)) {
        firestoreData[key] = null;
      } else if (!['assignedTeamMemberIds', 'assignedMaterials'].includes(key)) {
        delete firestoreData[key];
      }
    }
  });

  return firestoreData;
};

export const getEventsFS = async (): Promise<CrmEvent[]> => {
  const eventsCol = collection(db, EVENTS_COLLECTION);
  const q = query(eventsCol, orderBy('startDate', 'desc'));
  const eventSnapshot = await getDocs(q);
  return eventSnapshot.docs.map(docSnap => fromFirestoreEvent(docSnap));
};

export const getEventByIdFS = async (id: string): Promise<CrmEvent | null> => {
  if (!id) return null;
  const eventDocRef = doc(db, EVENTS_COLLECTION, id);
  const docSnap = await getDoc(eventDocRef);
  return docSnap.exists() ? fromFirestoreEvent(docSnap) : null;
};

export const addEventFS = async (data: EventFormValues): Promise<string> => {
  const firestoreData = toFirestoreEvent(data, true);
  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateEventFS = async (id: string, data: EventFormValues): Promise<void> => {
  const eventDocRef = doc(db, EVENTS_COLLECTION, id);
  const firestoreData = toFirestoreEvent(data, false);
  await updateDoc(eventDocRef, firestoreData);
};

export const deleteEventFS = async (id: string): Promise<void> => {
  const eventDocRef = doc(db, EVENTS_COLLECTION, id);
  await deleteDoc(eventDocRef);
};

export const initializeMockEventsInFirestore = async (mockEventsData: CrmEvent[]) => {
    const eventsCol = collection(db, EVENTS_COLLECTION);
    const snapshot = await getDocs(query(eventsCol, orderBy('createdAt', 'desc')));
    if (snapshot.empty && mockEventsData.length > 0) {
        for (const event of mockEventsData) {
            const { id, createdAt, updatedAt, startDate, endDate, ...eventData } = event;
            
            const firestoreReadyData: any = { ...eventData };
            firestoreReadyData.startDate = startDate ? Timestamp.fromDate(parseISO(startDate)) : Timestamp.fromDate(new Date());
            firestoreReadyData.endDate = endDate ? Timestamp.fromDate(parseISO(endDate)) : null;
            firestoreReadyData.createdAt = createdAt ? Timestamp.fromDate(parseISO(createdAt)) : Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? Timestamp.fromDate(parseISO(updatedAt)) : Timestamp.fromDate(new Date());
            firestoreReadyData.assignedTeamMemberIds = event.assignedTeamMemberIds || [];
            firestoreReadyData.assignedMaterials = event.assignedMaterials || [];
            
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

