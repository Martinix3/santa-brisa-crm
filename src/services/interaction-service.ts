

'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import {
  collection, addDoc, updateDoc, doc, Timestamp,
  getDocs, query, orderBy, limit, where, getDoc, setDoc
} from 'firebase-admin/firestore';
import type { InteractionFormValues } from '@/lib/schemas/interaction-schema';
import { toSearchName } from '@/lib/schemas/account-schema';
import type { Order } from '@/types';
import { fromFirestoreOrder } from './order-service';

const INTERACTIONS_COLLECTION = 'orders'; // Using 'orders' collection with a different status
const ACCOUNTS_COLLECTION = 'accounts';

// This is a placeholder. Replace with your actual user authentication logic.
async function getCurrentUser() {
  // In a real app, you'd get this from the session/headers.
  return { id: 'currentUserId', name: 'Usuario Actual', role: 'Ventas' };
}

function canCreateInteraction(user: { role: string }) {
  return ['Admin','Manager','Ventas','Clavadista','Líder Clavadista'].includes(user.role ?? '');
}

/** Create interaction and update metadata on the account */
export async function createInteractionAction(input: InteractionFormValues) {
  const user = await getCurrentUser();
  if (!canCreateInteraction(user)) {
    throw new Error('No tienes permisos para registrar interacciones.');
  }

  const now = Timestamp.now();
  let accountId = input.accountId;
  let accountName = input.accountName;

  // Handle implicit account creation
  if (!accountId && accountName) {
    const searchName = toSearchName(accountName);
    const existingQuery = db.collection(ACCOUNTS_COLLECTION).where('searchName', '==', searchName).limit(1);
    const existingSnap = await existingQuery.get();

    if (!existingSnap.empty) {
      accountId = existingSnap.docs[0].id;
    } else {
      const newAccountData = {
          name: accountName,
          searchName,
          type: 'prospect', // Default type for implicit creation
          ownership: input.ownershipHint || 'propio',
          status: 'lead',
          potencial: 'medio',
          leadScore: 50,
          createdAt: now,
          updatedAt: now,
          createdBy: user.id,
          owner_user_id: user.id,
          responsibleName: user.name,
      };
      const accountRef = await db.collection(ACCOUNTS_COLLECTION).add(newAccountData);
      accountId = accountRef.id;
    }
  } else if(accountId) {
      const accountSnap = await db.collection(ACCOUNTS_COLlection).doc(accountId).get();
      if(accountSnap.exists) {
          accountName = accountSnap.data()?.name || accountName;
      }
  }

  if (!accountId) {
    throw new Error("La cuenta es obligatoria para registrar una interacción.");
  }


  // 1) Save interaction
  const ref = await db.collection(INTERACTIONS_COLLECTION).add({
    accountId: accountId,
    clientName: accountName,
    type: input.type,
    status: 'Completado',
    date: Timestamp.fromDate(input.date),
    notes: input.note ?? null,
    nextActionDate: input.nextActionAt ? Timestamp.fromDate(input.nextActionAt) : null,
    createdAt: now,
    lastUpdated: now,
    createdBy: user.id,
    salesRep: user.name,
  });

  // 2) If this interaction came from a scheduled task, mark it as completed
  if (input.originatingTaskId) {
    await db.collection('orders').doc(input.originatingTaskId).update({
      status: 'Completado',
      lastUpdated: now,
      completedBy: user.id,
    });
  }

  // 3) Touch the account with useful info for scoring/status calculation
  await db.collection(ACCOUNTS_COLLECTION).doc(accountId).update({
    lastInteractionAt: Timestamp.fromDate(input.date),
    lastUpdated: now,
    lastTouchedBy: user.id,
  });

  return { ok: true, id: ref.id, accountId: accountId };
}

/** For a simple account selector (top recent) */
export async function listAccountsForSelectAction(params?: { q?: string }) {
  // Minimal implementation: if you have advanced search, change it here.
  const snap = await db.collection(ACCOUNTS_COLLECTION).orderBy('createdAt', 'desc').limit(20).get();
  return snap.docs.map(d => {
    const x = d.data() as any;
    return { id: d.id, name: x.name as string };
  });
}

export const saveInteractionFS = async (
    accountId: string,
    originatingTaskId: string | null | undefined,
    data: any, // Using 'any' as it's a mix of form values. Be careful.
    userId: string,
    userName: string
) => {
    const now = Timestamp.now();

    if(originatingTaskId) {
        const originalTaskRef = db.collection('orders').doc(originatingTaskId);
        await originalTaskRef.update({ status: "Completado", lastUpdated: now });
    }

    const accountRef = db.collection('accounts').doc(accountId);
    const accountSnap = await accountRef.get();
    if (!accountSnap.exists) throw new Error("Account not found");

    const newOrderRef = db.collection('orders').doc();

    const subtotal = (data.numberOfUnits || 0) * (data.unitPrice || 0);
    const totalValue = subtotal * 1.21;
    
    let salesRepName = userName;
    if (data.assignedSalesRepId && data.assignedSalesRepId !== userId) {
        const assignedRepDoc = await db.collection('teamMembers').doc(data.assignedSalesRepId).get();
        if(assignedRepDoc.exists) salesRepName = assignedRepDoc.data()?.name;
    }

    const newInteractionData: any = {
        clientName: accountSnap.data()?.name,
        accountId: accountId,
        createdAt: now,
        lastUpdated: now,
        salesRep: salesRepName,
        clavadistaId: data.clavadistaId && data.clavadistaId !== '##NONE##' ? data.clavadistaId : null,
        clientStatus: "existing",
        originatingTaskId: originatingTaskId,
        notes: data.notes || null,
        taskCategory: 'Commercial',
        orderIndex: 0
    };

    if (data.outcome === "successful") {
        newInteractionData.status = 'Confirmado';
        newInteractionData.visitDate = now;
        newInteractionData.numberOfUnits = data.numberOfUnits;
        newInteractionData.unitPrice = data.unitPrice;
        newInteractionData.value = totalValue;
        newInteractionData.paymentMethod = data.paymentMethod;
    } else if (data.outcome === "follow-up") {
        newInteractionData.status = 'Seguimiento';
        newInteractionData.nextActionType = data.nextActionType;
        newInteractionData.nextActionCustom = data.nextActionType === 'Opción personalizada' ? data.nextActionCustom : null;
        if (data.nextActionDate) {
            newInteractionData.nextActionDate = Timestamp.fromDate(data.nextActionDate);
        } else {
            newInteractionData.nextActionDate = null;
        }
    } else if (data.outcome === "failed") {
        newInteractionData.status = 'Fallido';
        newInteractionData.visitDate = now;
        newInteractionData.failureReasonType = data.failureReasonType;
        newInteractionData.failureReasonCustom = data.failureReasonType === 'Otro (especificar)' ? data.failureReasonCustom : null;
    } else { // Fallback for simple interactions without outcome
        newInteractionData.status = 'Completado';
        newInteractionData.visitDate = now;
        newInteractionData.type = data.outcome;
    }

    await newOrderRef.set(newInteractionData);
};
