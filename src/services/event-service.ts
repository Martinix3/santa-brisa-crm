

'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import type { firestore as adminFirestore } from 'firebase-admin';
import type { CrmEvent, EventFormValues, AssignedPromotionalMaterial } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const EVENTS_COLLECTION = 'events';

const fromFirestoreEvent = (docSnap: adminFirestore.DocumentSnapshot): CrmEvent => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");
  return {
    id: docSnap.id,
    name: data.name || '',
    type: data.type || 'Otro',
    status: data.status || 'Planificado',
    startDate: data.startDate instanceof adminFirestore.Timestamp ? format(data.startDate.toDate(), "yyyy-MM-dd") : (typeof data.startDate === 'string' ? data.startDate : format(new Date(), "yyyy-MM-dd")),
    endDate: data.endDate instanceof adminFirestore.Timestamp ? format(data.endDate.toDate(), "yyyy-MM-dd") : (typeof data.endDate === 'string' ? data.endDate : undefined),
    description: data.description || '',
    location: data.location || '',
    assignedTeamMemberIds: data.assignedTeamMemberIds || [],
    assignedMaterials: data.assignedMaterials || [],
    notes: data.notes || '',
    createdAt: data.createdAt instanceof adminFirestore.Timestamp ? format(data.createdAt.toDate(), "yyyy-MM-dd") : (typeof data.createdAt === 'string' ? data.createdAt : format(new Date(), "yyyy-MM-dd")),
    updatedAt: data.updatedAt instanceof adminFirestore.Timestamp ? format(data.updatedAt.toDate(), "yyyy-MM-dd") : (typeof data.updatedAt === 'string' ? data.updatedAt : format(new Date(), "yyyy-MM-dd")),
  };
};

const toFirestoreEvent = (data: EventFormValues, isNew: boolean): any => {
  const firestoreData: { [key: string]: any } = {
    name: data.name,
    type: data.type,
    status: data.status,
    startDate: data.startDate instanceof Date && isValid(data.startDate) ? adminFirestore.Timestamp.fromDate(data.startDate) : adminFirestore.Timestamp.fromDate(new Date()),
    endDate: data.endDate instanceof Date && isValid(data.endDate) ? adminFirestore.Timestamp.fromDate(data.endDate) : null,
    description: data.description || null,
    location: data.location || null,
    assignedTeamMemberIds: data.assignedTeamMemberIds || [],
    assignedMaterials: data.assignedMaterials || [],
    notes: data.notes || null,
  };

  if (isNew) {
    firestoreData.createdAt = adminFirestore.Timestamp.fromDate(new Date());
  }
  firestoreData.updatedAt = adminFirestore.Timestamp.fromDate(new Date());

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
  const eventsCol = db.collection(EVENTS_COLLECTION);
  const eventSnapshot = await eventsCol.orderBy('startDate', 'desc').get();
  return eventSnapshot.docs.map(docSnap => fromFirestoreEvent(docSnap));
};

export const getEventByIdFS = async (id: string): Promise<CrmEvent | null> => {
  if (!id) return null;
  const eventDocRef = db.collection(EVENTS_COLLECTION).doc(id);
  const docSnap = await eventDocRef.get();
  return docSnap.exists ? fromFirestoreEvent(docSnap) : null;
};

export const addEventFS = async (data: EventFormValues): Promise<string> => {
  const firestoreData = toFirestoreEvent(data, true);
  const docRef = await db.collection(EVENTS_COLLECTION).add(firestoreData);
  return docRef.id;
};

export const updateEventFS = async (id: string, data: EventFormValues): Promise<void> => {
  const eventDocRef = db.collection(EVENTS_COLLECTION).doc(id);
  const firestoreData = toFirestoreEvent(data, false);
  await eventDocRef.update(firestoreData);
};

export const deleteEventFS = async (id: string): Promise<void> => {
  const eventDocRef = db.collection(EVENTS_COLLECTION).doc(id);
  await eventDocRef.delete();
};


export const initializeMockEventsInFirestore = async (mockEventsData: CrmEvent[]) => {
    const eventsCol = db.collection(EVENTS_COLLECTION);
    const snapshot = await eventsCol.limit(1).get();
    if (snapshot.empty && mockEventsData.length > 0) {
        const batch = db.batch();
        mockEventsData.forEach(event => {
            const { id, createdAt, updatedAt, startDate, endDate, ...eventData } = event;
            
            const firestoreReadyData: any = { ...eventData };
            firestoreReadyData.startDate = startDate ? adminFirestore.Timestamp.fromDate(parseISO(startDate)) : adminFirestore.Timestamp.fromDate(new Date());
            firestoreReadyData.endDate = endDate ? adminFirestore.Timestamp.fromDate(parseISO(endDate)) : null;
            firestoreReadyData.createdAt = createdAt ? adminFirestore.Timestamp.fromDate(parseISO(createdAt)) : adminFirestore.Timestamp.fromDate(new Date());
            firestoreReadyData.updatedAt = updatedAt ? adminFirestore.Timestamp.fromDate(parseISO(updatedAt)) : adminFirestore.Timestamp.fromDate(new Date());
            firestoreReadyData.assignedTeamMemberIds = event.assignedTeamMemberIds || [];
            firestoreReadyData.assignedMaterials = event.assignedMaterials || [];
            
            firestoreReadyData.description = event.description || null;
            firestoreReadyData.location = event.location || null;
            firestoreReadyData.notes = event.notes || null;

            const docRef = eventsCol.doc();
            batch.set(docRef, firestoreReadyData);
        });
        await batch.commit();
        console.log('Mock events initialized in Firestore.');
    } else if (mockEventsData.length === 0) {
        console.log('No mock events to seed.');
    } else {
        console.log('Events collection is not empty. Skipping initialization.');
    }
};
