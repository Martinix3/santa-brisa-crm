
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import { collection, addDoc, updateDoc, doc, Timestamp, getDocs, query, where } from 'firebase-admin/firestore';
import { accountSchema, type AccountFormValues, toSearchName } from '@/lib/schemas/account-schema';
import { getAccounts, getTeamMembers } from '@/features/accounts/repo';
import { getOrders } from '@/services/order-service';
import { enrichCartera } from '@/features/accounts/cartera';
import type { Order } from '@/types';


// Colecciones (ajusta si tu naming difiere)
const ACCOUNTS = 'accounts';

// ⚠️ Sustituye por tu auth real
async function getCurrentUser() {
  // Esta es una implementación placeholder. En una app real, obtendrías el UID del usuario de la sesión.
  // Aquí simulamos que obtenemos un usuario admin para que las pruebas funcionen.
  const users = await getTeamMembersFS(['Admin']);
  if(users.length > 0) return users[0];
  return { id: 'adminUserId', name: 'Admin User', role: 'Admin' };
}

// (Opcional) check permisos básicos
function canEditAccounts(user: {role: string}) {
  return ['Admin','Manager','Ventas'].includes(user.role ?? '');
}

// (Opcional) soft-check de duplicados por searchName
async function existsAccountBySearchName(searchName: string) {
  const snap = await db.collection(ACCOUNTS).where('searchName', '==', searchName).limit(1).get();
  return !snap.empty;
}

/**
 * Crea o actualiza una cuenta.
 * - Valida con Zod
 * - Normaliza `searchName`
 * - Asigna responsable = creador (solo en creación)
 * - Control de permisos básico
 */
export async function upsertAccountAction(input: AccountFormValues) {
  const user = await getCurrentUser();
  if (!canEditAccounts(user)) {
    throw new Error('No tienes permisos para crear/editar cuentas.');
  }

  const data = accountSchema.parse(input);
  const searchName = toSearchName(data.name);

  const payload = {
    name: data.name,
    vat_number: data.cif ?? null,
    type: data.type,
    phone: data.phone ?? null,
    email: data.email ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    notes: data.notes ?? null,
    distribution_type: data.ownership,
    distributor_id: data.ownership === 'distribuidor' ? (data.distributorId ?? null) : null,
    searchName,
    updatedAt: Timestamp.now(),
    updatedBy: user.id,
  };

  if (data.id) {
    await db.collection(ACCOUNTS).doc(data.id).update(payload);
    return { ok: true, id: data.id, op: 'updated' as const };
  } else {
    // Soft check de duplicado por nombre normalizado (no bloquea, solo si quieres)
    // if (await existsAccountBySearchName(searchName)) {
    //   throw new Error('Ya existe una cuenta con un nombre muy similar.');
    // }

    const now = Timestamp.now();
    const ref = await db.collection(ACCOUNTS).add({
      ...payload,
      status: 'prospect', // Default status for new accounts
      createdAt: now,
      createdBy: user.id,
      owner_user_id: user.id,
      responsibleName: user.name, // Legacy field, might be useful
    });
    return { ok: true, id: ref.id, op: 'created' as const };
  }
}

export async function getCarteraBundle() {
    const [accounts, orders, teamMembers] = await Promise.all([
        getAccounts(),
        getOrders(),
        getTeamMembers()
    ]);
    
    const enrichedAccounts = enrichCartera(accounts, orders, teamMembers);
    
    return { enrichedAccounts, teamMembers };
}


export async function getAccountHistory(accountId: string) {
    const history = await getRecentHistoryByAccount(accountId);
    return history.map((item: Order) => ({
      id: item.id,
      date: item.createdAt,
      title: item.notes || item.nextActionType || `Pedido de ${item.value?.toFixed(2) ?? '0.00'} €`,
      kind: item.value ? 'order' : 'interaction',
      amount: item.value,
      status: item.status,
    }));
}

// Helper function import moved from another file.
// We need to move this from where it was before, as it caused a circular dependency
async function getTeamMembersFS(roles?: any[]): Promise<TeamMember[]> {
  const membersCol = collection(db, 'teamMembers');
  let q;

  if (roles && roles.length > 0) {
    q = query(membersCol, where('role', 'in', roles));
  } else {
    q = query(membersCol);
  }
  
  const snapshot = await getDocs(q);
  // This is a simplified converter. You should use your `fromFirestoreTeamMember`
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
}
