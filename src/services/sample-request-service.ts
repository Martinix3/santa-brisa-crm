
"use client";

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
  query,
  orderBy
} from 'firebase/firestore';
import type { SampleRequest, SampleRequestFormValues, SampleRequestStatus } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const SAMPLE_REQUESTS_COLLECTION = 'sampleRequests';

const fromFirestoreSampleRequest = (docSnap: any): SampleRequest => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    requesterId: data.requesterId,
    requesterName: data.requesterName,
    clientId: data.clientId || undefined,
    clientName: data.clientName,
    purpose: data.purpose,
    numberOfSamples: data.numberOfSamples,
    justificationNotes: data.justificationNotes,
    status: data.status || 'Pendiente',
    requestDate: data.requestDate instanceof Timestamp ? format(data.requestDate.toDate(), "yyyy-MM-dd'T'HH:mm:ss") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
    decisionDate: data.decisionDate instanceof Timestamp ? format(data.decisionDate.toDate(), "yyyy-MM-dd'T'HH:mm:ss") : undefined,
    adminNotes: data.adminNotes || undefined,
  };
};

export const getSampleRequestsFS = async (): Promise<SampleRequest[]> => {
  const requestsCol = collection(db, SAMPLE_REQUESTS_COLLECTION);
  const q = query(requestsCol, orderBy('requestDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => fromFirestoreSampleRequest(docSnap));
};

export const addSampleRequestFS = async (data: SampleRequestFormValues & { requesterId: string; requesterName: string }): Promise<string> => {
  const firestoreData = {
    ...data,
    status: 'Pendiente',
    requestDate: Timestamp.fromDate(new Date()),
    decisionDate: null,
    adminNotes: null,
  };
  const docRef = await addDoc(collection(db, SAMPLE_REQUESTS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateSampleRequestStatusFS = async (id: string, status: SampleRequestStatus, adminNotes?: string): Promise<void> => {
  const requestDocRef = doc(db, SAMPLE_REQUESTS_COLLECTION, id);
  const updateData: { status: SampleRequestStatus; decisionDate: Timestamp; adminNotes?: string } = {
    status,
    decisionDate: Timestamp.fromDate(new Date()),
  };
  if (adminNotes) {
    updateData.adminNotes = adminNotes;
  }
  await updateDoc(requestDocRef, updateData);
};
