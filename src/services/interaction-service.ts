
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
import { addOrderFS } from './order-service';

const INTERACTIONS_COLLECTION = 'orders'; // We keep using 'orders' for now to avoid a big migration

export async function saveInteractionFS(
  accountId: string, 
  interactionId: string | undefined,
  data: InlineEditorFormValues, 
  userId: string,
  userName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const subtotal = (data.unidades || 0) * (data.precioUnitario || 0);
    const totalValue = subtotal * 1.21;
    
    const baseData: Partial<Order> = {
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
    
    let interactionData: Partial<Order> = {};

    switch (data.outcome) {
      case 'Pedido':
        interactionData = {
          ...baseData,
          status: 'Confirmado',
          numberOfUnits: data.unidades,
          unitPrice: data.precioUnitario,
          value: totalValue,
          paymentMethod: 'Adelantado', 
        };
        break;
      case 'Seguimiento':
        interactionData = { ...baseData, status: 'Seguimiento', nextActionType: 'Visitar de nuevo' };
        break;
      case 'Visita':
        interactionData = { ...baseData, status: 'Fallido', failureReasonType: 'No interesado' };
        break;
      default:
        interactionData = { ...baseData, status: 'Completado', nextActionType: data.outcome };
        break;
    }
    
    // addOrderFS already handles the transaction logic for updating the originating task.
    // We pass undefined for originatingTaskId if it's a new interaction from the inline form.
    await addOrderFS(interactionData);
    
    return { success: true };
  } catch (e: any) {
    console.error("Error saving interaction: ", e);
    return { success: false, error: e.message };
  }
}
