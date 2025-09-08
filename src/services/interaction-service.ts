
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import {
  collection, addDoc, updateDoc, doc, Timestamp,
  getDocs, query, orderBy, limit, where
} from 'firebase-admin/firestore';
import type { InteractionFormValues } from '@/lib/schemas/interaction-schema';

const INTERACTIONS_COLLECTION = 'interactions'; // Using a separate collection now
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

  const data = interactionSchema.parse(input);
  const now = Timestamp.now();

  // 1) Save interaction
  const ref = await addDoc(collection(db, INTERACTIONS_COLLECTION), {
    accountId: data.accountId,
    type: data.type,
    date: Timestamp.fromDate(data.date),
    outcome: data.outcome ?? null,
    note: data.note ?? null,
    nextActionAt: data.nextActionAt ? Timestamp.fromDate(data.nextActionAt) : null,
    createdAt: now,
    createdBy: user.id,
  });

  // 2) If this interaction came from a scheduled task, mark it as completed
  if (data.originatingTaskId) {
    // Assuming tasks might be in the 'orders' collection with a specific status
    await updateDoc(doc(db, 'orders', data.originatingTaskId), {
      status: 'Completado',
      lastUpdated: now,
    });
  }

  // 3) Touch the account with useful info for scoring/status calculation
  await updateDoc(doc(db, ACCOUNTS_COLLECTION, data.accountId), {
    lastInteractionAt: Timestamp.fromDate(data.date),
    lastUpdated: now,
    lastTouchedBy: user.id,
  });

  return { ok: true, id: ref.id };
}

/** For a simple account selector (top recent) */
export async function listAccountsForSelectAction(params?: { q?: string }) {
  // Minimal implementation: if you have advanced search, change it here.
  const snap = await getDocs(query(collection(db, ACCOUNTS_COLLECTION), orderBy('name', 'asc'), limit(20)));
  return snap.docs.map(d => {
    const x = d.data() as any;
    return { id: d.id, name: x.name as string };
  });
}
