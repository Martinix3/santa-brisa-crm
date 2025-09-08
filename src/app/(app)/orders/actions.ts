
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import { collection, addDoc, doc, getDoc, Timestamp } from 'firebase-admin/firestore';
import { orderSchema, type OrderFormValues } from '@/lib/schemas/order-schema';
import type { InventoryItem, Account } from '@/types';
import { toSearchName } from '@/lib/schemas/account-schema';

const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';
const ORDERS_COLLECTION = 'orders';
const ACCOUNTS_COLLECTION = 'accounts';

async function getCurrentUser() {
  return { id: "currentUserId", name: "Usuario Actual" };
}

export async function createOrderAction(input: OrderFormValues) {
  const user = await getCurrentUser();
  const data = orderSchema.parse(input);

  let accountId = data.accountId;
  let accountName = data.accountName;

  // Handle implicit account creation
  if (!accountId && accountName) {
      const newAccountData = {
          name: accountName,
          searchName: toSearchName(accountName),
          type: 'customer', // Default type for implicit creation
          ownership: data.ownershipHint || 'propio',
          status: 'lead',
          potencial: 'medio',
          leadScore: 50,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: user.id,
          owner_user_id: user.id,
          responsibleName: user.name,
      };
      const accountRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), newAccountData);
      accountId = accountRef.id;
  } else if(accountId) {
      const accountSnap = await getDoc(doc(db, ACCOUNTS_COLLECTION, accountId));
      if(accountSnap.exists()) {
          accountName = accountSnap.data()?.name || accountName;
      }
  }

  if (!accountId) {
      throw new Error("No se pudo determinar la cuenta para el pedido.");
  }


  // Validar inventario y enriquecer líneas
  const linesPromises = data.lines.map(async (l) => {
    const snap = await getDoc(doc(db, INVENTORY_ITEMS_COLLECTION, l.inventoryId));
    if (!snap.exists()) throw new Error(`Inventario no encontrado: ${l.inventoryId}`);
    
    const inv = snap.data() as InventoryItem;
    const unitPrice = l.unitPrice ?? inv.latestPurchase?.calculatedUnitCost ?? 0;
    const total = unitPrice * l.qty;

    return {
      ...l,
      lineType: inv.categoryId, 
      sku: inv.sku || 'N/A',
      name: inv.name,
      uom: inv.uom || 'unit',
      unitPrice,
      total,
    };
  });
  
  const lines = await Promise.all(linesPromises);

  const subtotal = lines.reduce((s, x) => s + x.total, 0);
  const taxes = 0; // Ajustar si es necesario
  const total = subtotal + taxes;
  const now = Timestamp.now();

  const ref = await addDoc(collection(db, ORDERS_COLLECTION), {
    accountId: accountId,
    accountName: accountName,
    channel: data.channel,
    distributorId: data.channel === "distribuidor" ? data.distributorId ?? null : null,
    currency: data.currency,
    lines,
    subtotal, 
    taxes, 
    total,
    notes: data.notes ?? null,
    status: data.channel === "distribuidor" ? "Registrado_distribuidor" : "Borrador",
    createdAt: now,
    lastUpdated: now,
    responsibleId: user.id,
  });

  return { ok: true, id: ref.id, accountId: accountId };
}
