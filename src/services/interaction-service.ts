
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
import type { Interaction, InteractionResult, InteractionType, InteractionOutcome, Order, InlineEditorFormValues } from '@/types';

const INTERACTIONS_COLLECTION = 'orders'; // We keep using 'orders' for now to avoid a big migration

export async function saveInteractionFS(
  accountId: string, 
  interactionId: string | undefined,
  data: InlineEditorFormValues, 
  userId: string,
  userName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const interactionData: Partial<Order> = {
      accountId: accountId,
      visitDate: data.date.toISOString(),
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      salesRep: userName,
      notes: data.notes,
      orderIndex: 0,
      clientStatus: 'existing',
      taskCategory: 'Commercial',
    };
    
    // Map outcome to status and other fields
    switch (data.outcome) {
      case 'Pedido':
        interactionData.status = 'Confirmado';
        interactionData.numberOfUnits = data.unidades;
        interactionData.unitPrice = data.precioUnitario;
        interactionData.value = data.value;
        interactionData.paymentMethod = 'Adelantado'; // Default or from a form field if available
        break;
      case 'Visita':
        interactionData.status = 'Fallido'; // Default for a simple visit
        break;
      case 'Seguimiento':
        interactionData.status = 'Seguimiento';
        interactionData.nextActionType = 'Visitar de nuevo'; // Default
        break;
      case 'Llamada':
      case 'Email':
      case 'Incidencia':
      case 'Otro':
        interactionData.status = 'Completado'; // A simple log
        interactionData.nextActionType = data.outcome;
        break;
    }

    if (interactionId) {
      // Update existing interaction (e.g., a scheduled task)
      const docRef = doc(db, INTERACTIONS_COLLECTION, interactionId);
      await updateDoc(docRef, { ...interactionData, status: 'Completado' });
    } else {
      // Create new interaction
      await addDoc(collection(db, INTERACTIONS_COLLECTION), interactionData);
    }
    
    return { success: true };
  } catch (e: any) {
    console.error("Error saving interaction: ", e);
    return { success: false, error: e.message };
  }
}
