
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
import type { Order } from '@/types';
import type { InteractionFormValues } from '@/lib/schemas/interaction-schema';

const INTERACTIONS_COLLECTION = 'orders'; // We keep using 'orders' for now to avoid a big migration

export async function saveInteractionFS(
  accountId: string, 
  originatingTaskId: string | undefined,
  data: InteractionFormValues, 
  userId: string,
  userName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    
    await runTransaction(db, async (transaction) => {
        // If there was an originating task (a 'Programada' or 'Seguimiento' task), we mark it as 'Completado'
        if (originatingTaskId) {
          const originalTaskRef = doc(db, INTERACTIONS_COLLECTION, originatingTaskId);
          transaction.update(originalTaskRef, {
            status: 'Completado',
            lastUpdated: Timestamp.now(),
          });
        }
        
        const newInteractionRef = doc(collection(db, INTERACTIONS_COLLECTION));
        
        const subtotal = (data.unidades || 0) * (data.precioUnitario || 0);
        const totalValue = subtotal * 1.21;
        
        const baseData: Partial<Order> = {
            accountId: accountId,
            clientName: data.clientName,
            salesRep: userName,
            notes: data.notes,
            orderIndex: 0,
            clientStatus: 'existing',
            taskCategory: 'Commercial',
            assignedMaterials: data.assignedMaterials || [],
            originatingTaskId: originatingTaskId,
            distributorId: data.distributorId,
        };
        
        let interactionData: Partial<Order> = {};

        switch (data.outcome) {
          case 'Pedido':
            interactionData = {
              ...baseData,
              status: 'Confirmado',
              visitDate: new Date().toISOString(),
              numberOfUnits: data.unidades,
              unitPrice: data.precioUnitario,
              value: totalValue,
              paymentMethod: 'Adelantado',
            };
            break;
          case 'Seguimiento':
            interactionData = { ...baseData, status: 'Seguimiento', nextActionType: 'Visitar de nuevo', nextActionDate: new Date().toISOString() };
            break;
          case 'Visita':
          case 'Llamada':
          case 'Email':
          case 'Otro':
          default:
            interactionData = { ...baseData, status: 'Completado', visitDate: new Date().toISOString() };
            break;
        }
        
        transaction.set(newInteractionRef, {
            ...interactionData,
            createdAt: Timestamp.now(),
            lastUpdated: Timestamp.now(),
            visitDate: interactionData.visitDate ? Timestamp.fromDate(new Date(interactionData.visitDate)) : null,
            nextActionDate: interactionData.nextActionDate ? Timestamp.fromDate(new Date(interactionData.nextActionDate)) : null,
        });
    });
    
    return { success: true };
  } catch (e: any) {
    console.error("Error saving interaction: ", e);
    return { success: false, error: e.message };
  }
}
