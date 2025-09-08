'use server';

import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy,
  type DocumentSnapshot,
} from "firebase/firestore";
import type { SampleRequest, SampleRequestFormValues, AddressDetails } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { EstadoSolicitudMuestra as SampleRequestStatus } from "@ssot";

const SAMPLE_REQUESTS_COLLECTION = 'sampleRequests';

const fromFirestoreSampleRequest = (docSnap: DocumentSnapshot): SampleRequest => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  return {
    id: docSnap.id,
    requesterId: data.requesterId,
    requesterName: data.requesterName,
    accountId: data.accountId || undefined,
    clientName: data.clientName,
    purpose: data.purpose,
    numberOfSamples: data.numberOfSamples,
    justificationNotes: data.justificationNotes,
    status: data.status || 'Pendiente',
    requestDate: data.requestDate instanceof Timestamp ? format(data.requestDate.toDate(), "yyyy-MM-dd'T'HH:mm:ss") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
    decisionDate: data.decisionDate instanceof Timestamp ? format(data.decisionDate.toDate(), "yyyy-MM-dd'T'HH:mm:ss") : undefined,
    adminNotes: data.adminNotes || undefined,
    shippingAddress: data.shippingAddress || undefined,
  };
};

export const getSampleRequestsFS = async (): Promise<SampleRequest[]> => {
  const requestsCol = collection(db, SAMPLE_REQUESTS_COLLECTION);
  const q = query(requestsCol, orderBy('requestDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => fromFirestoreSampleRequest(docSnap));
};

export const addSampleRequestFS = async (data: SampleRequestFormValues & { requesterId: string; requesterName: string }): Promise<string> => {
  
  let shippingAddress: AddressDetails | null = null;
  if (data.shippingAddress_street || data.shippingAddress_city || data.shippingAddress_province || data.shippingAddress_postalCode) {
    shippingAddress = {
      street: data.shippingAddress_street || null,
      number: data.shippingAddress_number || null,
      city: data.shippingAddress_city || null,
      province: data.shippingAddress_province || null,
      postalCode: data.shippingAddress_postalCode || null,
      country: data.shippingAddress_country || "España",
    };
    Object.keys(shippingAddress).forEach(key => {
        if(shippingAddress![key as keyof AddressDetails] === undefined) shippingAddress![key as keyof AddressDetails] = null as any;
    });
  }

  const firestoreData = {
    requesterId: data.requesterId,
    requesterName: data.requesterName,
    clientStatus: data.clientStatus,
    accountId: data.accountId || null,
    clientName: data.clientName,
    purpose: data.purpose,
    numberOfSamples: data.numberOfSamples,
    justificationNotes: data.justificationNotes,
    shippingAddress: shippingAddress,
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
  await updateDoc(requestDocRef, updateData as any);
};

export const deleteSampleRequestFS = async (id: string): Promise<void> => {
  if (!id) {
    console.error("deleteSampleRequestFS called with no ID.");
    return;
  }
  const requestDocRef = doc(db, SAMPLE_REQUESTS_COLLECTION, id);
  await deleteDoc(requestDocRef);
};
