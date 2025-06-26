
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import * as adminFirestore from 'firebase-admin/firestore';
import type { SampleRequest, SampleRequestFormValues, SampleRequestStatus, AddressDetails } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

const SAMPLE_REQUESTS_COLLECTION = 'sampleRequests';

const fromFirestoreSampleRequest = (docSnap: adminFirestore.DocumentSnapshot<adminFirestore.DocumentData>): SampleRequest => {
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
    requestDate: data.requestDate instanceof adminFirestore.Timestamp ? format(data.requestDate.toDate(), "yyyy-MM-dd'T'HH:mm:ss") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
    decisionDate: data.decisionDate instanceof adminFirestore.Timestamp ? format(data.decisionDate.toDate(), "yyyy-MM-dd'T'HH:mm:ss") : undefined,
    adminNotes: data.adminNotes || undefined,
    shippingAddress: data.shippingAddress || undefined,
  };
};

export const getSampleRequestsFS = async (): Promise<SampleRequest[]> => {
  const requestsCol = adminFirestore.collection(db, SAMPLE_REQUESTS_COLLECTION);
  const q = adminFirestore.query(requestsCol, adminFirestore.orderBy('requestDate', 'desc'));
  const snapshot = await adminFirestore.getDocs(q);
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
    requestDate: adminFirestore.Timestamp.fromDate(new Date()),
    decisionDate: null,
    adminNotes: null,
  };

  const docRef = await adminFirestore.addDoc(adminFirestore.collection(db, SAMPLE_REQUESTS_COLLECTION), firestoreData);
  return docRef.id;
};

export const updateSampleRequestStatusFS = async (id: string, status: SampleRequestStatus, adminNotes?: string): Promise<void> => {
  const requestDocRef = adminFirestore.doc(db, SAMPLE_REQUESTS_COLLECTION, id);
  const updateData: { status: SampleRequestStatus; decisionDate: adminFirestore.Timestamp; adminNotes?: string } = {
    status,
    decisionDate: adminFirestore.Timestamp.fromDate(new Date()),
  };
  if (adminNotes) {
    updateData.adminNotes = adminNotes;
  }
  await adminFirestore.updateDoc(requestDocRef, updateData as any);
};
