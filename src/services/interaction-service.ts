
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  type DocumentSnapshot,
  runTransaction,
} from 'firebase/firestore';
import type { Interaction, InteractionResult, InteractionType } from '@/types';

const INTERACTIONS_COLLECTION = 'orders'; // We keep using 'orders' collection for now to avoid a big migration

const fromFirestoreInteraction = (docSnap: DocumentSnapshot): Interaction => {
  const data = docSnap.data();
  if (!data) throw new Error("Document data is undefined.");

  const parseTimestamp = (ts: any): Timestamp | undefined => {
    if (!ts) return undefined;
    if (ts instanceof Timestamp) return ts;
    if (typeof ts === 'string') return Timestamp.fromDate(new Date(ts));
    if (typeof ts === 'object' && ts.seconds) return new Timestamp(ts.seconds, ts.nanoseconds);
    return undefined;
  };

  return {
    id: docSnap.id,
    accountId: data.accountId,
    date: parseTimestamp(data.visitDate || data.createdAt)!,
    type: data.nextActionType || 'Visita', // Fallback
    result: data.status, // We can map this better later
    valueEUR: data.value,
    salesRepId: data.salesRepId || '',
    notes: data.notes,
    managed: data.status === 'Completado',
    nextAction: data.nextActionDate ? {
      type: data.nextActionType || 'Otro',
      date: parseTimestamp(data.nextActionDate),
    } : undefined,
    createdBy: data.createdBy || 'system',
    createdAt: parseTimestamp(data.createdAt)!,
  };
};


export const addInteractionFS = async (
  accountId: string,
  data: Partial<Omit<Interaction, 'id' | 'accountId' | 'createdBy' | 'createdAt'>>
): Promise<string> => {
    const docRef = await addDoc(collection(db, INTERACTIONS_COLLECTION), {
        accountId,
        ...data,
        createdAt: Timestamp.now(),
        // createdBy should be added from auth context
    });
    return docRef.id;
};

export const updateInteractionFS = async (
  interactionId: string,
  data: Partial<Omit<Interaction, 'id'>>
): Promise<void> => {
  const docRef = doc(db, INTERACTIONS_COLLECTION, interactionId);
  await updateDoc(docRef, { ...data });
};

export const completeNextActionFS = async (
    accountId: string,
    payload: {
        type: InteractionType;
        result: InteractionResult;
        valueEUR?: number;
        notes?: string;
        nextAction?: Interaction['nextAction'];
    }
): Promise<void> => {
    // This function can encapsulate the logic of completing a task and creating a new one
    // For now, it will be a simple add.
    const newInteractionData = {
        accountId,
        date: Timestamp.now(),
        ...payload,
        salesRepId: 'current_user_placeholder', // Should come from auth context
        createdBy: 'current_user_placeholder',
        createdAt: Timestamp.now(),
    };
    await addDoc(collection(db, INTERACTIONS_COLLECTION), newInteractionData);
};

// A server action to save the form data from the inline editor
export async function saveInteractionFS(
  accountId: string, 
  interactionId: string | undefined, // if undefined, it's a new interaction
  data: any, // data from the form
  userId: string // authenticated user id
): Promise<{ success: boolean; error?: string }> {
  try {
    const interactionData = {
      accountId: accountId,
      date: data.date ? Timestamp.fromDate(new Date(data.date)) : Timestamp.now(),
      type: data.type,
      result: data.result,
      valueEUR: data.valueEUR,
      notes: data.notes,
      salesRepId: data.salesRepId || userId,
      managed: data.managed,
      nextAction: data.nextActionDate ? { type: data.nextActionType, date: Timestamp.fromDate(new Date(data.nextActionDate)) } : null,
      updatedAt: Timestamp.now(),
    };

    if (interactionId) {
      // Update existing interaction
      const docRef = doc(db, INTERACTIONS_COLLECTION, interactionId);
      await updateDoc(docRef, interactionData);
    } else {
      // Create new interaction
      await addDoc(collection(db, INTERACTIONS_COLLECTION), {
        ...interactionData,
        createdBy: userId,
        createdAt: Timestamp.now(),
      });
    }
    return { success: true };
  } catch (e: any) {
    console.error("Error saving interaction: ", e);
    return { success: false, error: e.message };
  }
}
