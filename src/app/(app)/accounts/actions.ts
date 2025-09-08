'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import { collection, addDoc, updateDoc, doc, FieldValue } from 'firebase-admin/firestore';
import { accountSchema, type AccountFormValues, toSearchName } from '@/lib/schemas/account-schema';

const ACCOUNTS = 'accounts';

// ⚠️ Esta es una simulación. En una app real, obtendrías el usuario de la sesión.
async function getCurrentUser() {
  return { id: 'currentUserId', name: 'Usuario Actual', role: 'Ventas' };
}

// Check de permisos básico.
function canEditAccounts(user: {role: string}) {
  return ['Admin','Manager','Ventas'].includes(user.role ?? '');
}

/**
 * Crea o actualiza una cuenta en Firestore.
 * - Valida los datos de entrada con Zod.
 * - Normaliza el nombre para búsquedas.
 * - Usa FieldValue.serverTimestamp() para las fechas, compatible con Server Actions.
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
    cif: data.cif ?? null,
    type: data.type,
    phone: data.phone ?? null,
    email: data.email ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    notes: data.notes ?? null,
    ownership: data.ownership,
    distributorId: data.ownership === 'distribuidor' ? (data.distributorId ?? null) : null,
    searchName,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: user.id,
    // --- Campos de estado inicial ---
    status: 'lead',
    potencial: 'medio',
    leadScore: 50,
  };

  if (data.id) {
    await updateDoc(doc(db, ACCOUNTS, data.id), payload);
    return { ok: true, id: data.id, op: 'updated' as const };
  } else {
    const ref = await addDoc(collection(db, ACCOUNTS), {
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: user.id,
      owner_user_id: user.id, 
      responsibleName: user.name, 
    });
    return { ok: true, id: ref.id, op: 'created' as const };
  }
}
