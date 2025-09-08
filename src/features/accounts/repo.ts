

// Firestore I/O centralizado para el feature de Cuentas
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, Timestamp
} from "firebase-admin/firestore";
import type {
  Account, Order, TeamMember, Interaction, // ajusta según tu /types
  OrderStatus
} from '@/types';
import { fromFirestore } from '@/services/account-mapper';
import { fromFirestoreOrder } from '@/services/order-service';
import { fromFirestoreTeamMember } from '@/services/utils/firestore-converters';


const ACCOUNTS = 'accounts';
const ORDERS = 'orders';
const TEAM_MEMBERS = 'teamMembers';

// ---- Lecturas ---------------------------------------------------------------
export async function getAccounts(): Promise<Account[]> {
  const snap = await db.collection(ACCOUNTS).orderBy('name', 'asc').get();
  return snap.docs.map(d => fromFirestore({ id: d.id, ...d.data() }));
}

export async function getAccountById(accountId: string): Promise<Account | null> {
  const ref = db.collection(ACCOUNTS).doc(accountId);
  const snap = await ref.get();
  return snap.exists ? fromFirestore({ id: snap.id, ...snap.data() }) : null;
}

export async function getOrdersByAccount(accountId: string): Promise<Order[]> {
  const q = db.collection(ORDERS)
    .where('accountId', '==', accountId)
    .orderBy('createdAt', 'desc');
  const snap = await q.get();
  return snap.docs.map(d => fromFirestoreOrder(d));
}

// Historial reciente (mezcla pedidos + interacciones si las guardas en ORDERS)
export async function getRecentHistoryByAccount(
  accountId: string,
  maxItems = 10
): Promise<(Order | Interaction)[]> {
  const q = db.collection(ORDERS)
    .where('accountId', '==', accountId)
    .orderBy('createdAt', 'desc')
    .limit(maxItems);
  const snap = await q.get();
  return snap.docs.map(d => fromFirestoreOrder(d));
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const snap = await db.collection(TEAM_MEMBERS).get();
  return snap.docs.map(d => fromFirestoreTeamMember(d));
}

// ---- Escrituras -------------------------------------------------------------
export async function updateAccount(accountId: string, patch: Partial<Account>): Promise<void> {
  await db.collection(ACCOUNTS).doc(accountId).update({
    ...patch,
    updatedAt: Timestamp.now(),
  });
}

export async function saveInteraction(
  input: Omit<Interaction, 'id' | 'createdAt' | 'lastUpdated'>
): Promise<{ ok: true; id: string }> {
  const ref = await db.collection(ORDERS).add({
    ...input,
    kind: 'interaction',
    createdAt: Timestamp.now(),
    lastUpdated: Timestamp.now(),
  });
  return { ok: true, id: ref.id };
}

export async function saveOrder(
  input: Omit<Order, 'id' | 'createdAt' | 'lastUpdated' | 'status'> & { status?: OrderStatus }
): Promise<{ ok: true; id: string }> {
  const ref = await db.collection(ORDERS).add({
    ...input,
    kind: 'order',
    status: input.status ?? 'Borrador',
    createdAt: Timestamp.now(),
    lastUpdated: Timestamp.now(),
  });
  return { ok: true, id: ref.id };
}
