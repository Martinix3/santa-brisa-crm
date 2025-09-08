
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import {
  collection, addDoc, updateDoc, doc, Timestamp,
  getDocs, query, orderBy, limit, where
} from 'firebase-admin/firestore';
import type { InteractionFormValues } from '@/lib/schemas/interaction-schema';

const INTERACTIONS_COLLECTION = 'orders'; // Using 'orders' collection with a different status
const ACCOUNTS_COLLECTION = 'accounts';

// This is a placeholder. Replace with your actual user authentication logic.
async function getCurrentUser() {
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

  // const data = interactionSchema.parse(input);
  const now = Timestamp.now();

  // 1) Save interaction
  const ref = await addDoc(collection(db, INTERACTIONS_COLLECTION), {
    accountId: input.accountId,
    clientName: 'Hardcoded Name', // This needs to be fixed by fetching account name
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
    // Assuming tasks are in the 'orders' collection with a specific status
    await updateDoc(doc(db, 'orders', input.originatingTaskId), {
      status: 'Completado',
      lastUpdated: now,
      completedBy: user.id,
    });
  }

  // 3) Touch the account with useful info for scoring/status calculation
  await updateDoc(doc(db, ACCOUNTS_COLLECTION, input.accountId), {
    lastInteractionAt: Timestamp.fromDate(input.date),
    lastUpdated: now,
    lastTouchedBy: user.id,
  });

  return { ok: true, id: ref.id };
}

/** For a simple account selector (top recent) */
export async function listAccountsForSelectAction(params?: { q?: string }) {
  // Minimal implementation: if you have advanced search, change it here.
  const snap = await getDocs(query(collection(db, ACCOUNTS_COLLECTION), orderBy('createdAt', 'desc'), limit(20)));
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
        const originalTaskRef = doc(db, 'orders', originatingTaskId);
        await updateDoc(originalTaskRef, { status: "Completado", lastUpdated: now });
    }

    const accountRef = doc(db, 'accounts', accountId);
    const accountSnap = await accountRef.get();
    if (!accountSnap.exists()) throw new Error("Account not found");

    const newOrderRef = doc(collection(db, 'orders'));

    const subtotal = (data.numberOfUnits || 0) * (data.unitPrice || 0);
    const totalValue = subtotal * 1.21;
    
    let salesRepName = userName;
    if (data.assignedSalesRepId && data.assignedSalesRepId !== userId) {
        const assignedRepDoc = await doc(db, 'teamMembers', data.assignedSalesRepId).get();
        if(assignedRepDoc.exists()) salesRepName = assignedRepDoc.data()?.name;
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
    }

    await setDoc(newOrderRef, newInteractionData);
};
