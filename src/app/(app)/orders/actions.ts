
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import { collection, addDoc, doc, getDoc, Timestamp } from 'firebase-admin/firestore';
import { orderSchema, type OrderFormValues } from '@/lib/schemas/order-schema';
import { findOrCreateAccountByName } from '@/app/(app)/accounts/actions';
import type { InventoryItem } from '@/types';

const INVENTORY_ITEMS_COLLECTION = 'inventoryItems';
const ORDERS_COLLECTION = 'orders';

async function getCurrentUser() {
  return { id: "currentUserId", name: "Usuario Actual" };
}

export async function createOrderAction(input: OrderFormValues) {
  const user = await getCurrentUser();
  const data = orderSchema.parse(input);

  // 0) Resolver cuenta: si no hay accountId, se busca por nombre o se crea
  let accountId = data.accountId;
  let accountName = data.accountName ?? "";
  if (!accountId) {
    if (!accountName) throw new Error("Falta el nombre de cuenta");
    const acc = await findOrCreateAccountByName({
      name: accountName,
      ownership: data.ownershipHint ?? (data.channel === "distribuidor" ? "distribuidor" : "propio"),
      distributorId: data.channel === "distribuidor" ? (data.distributorId ?? null) : null,
    });
    accountId = acc.id;
    accountName = acc.name;
  }

  // 1) Validar/normalizar líneas contra inventario
  const lines = [];
  for (const l of data.lines) {
    const snap = await getDoc(doc(db, INVENTORY_ITEMS_COLLECTION, l.inventoryId));
    if (!snap.exists()) throw new Error(`Inventario no encontrado: ${l.inventoryId}`);
    const inv = snap.data() as InventoryItem;
    const unitPrice = l.unitPrice ?? inv.latestPurchase?.calculatedUnitCost ?? 0;
    const total = unitPrice * l.qty;
    lines.push({
      ...l,
      lineType: inv.categoryId, // O usa una lógica para determinar si es producto o PLV
      sku: inv.sku || 'N/A',
      name: inv.name,
      uom: inv.uom ?? "unit",
      unitPrice,
      total,
    });
  }

  const subtotal = lines.reduce((s,x)=>s+x.total,0);
  const taxes = 0;
  const total = subtotal + taxes;
  const now = Timestamp.now();

  const ref = await addDoc(collection(db, ORDERS_COLLECTION), {
    accountId, accountName,
    channel: data.channel,
    distributorId: data.channel==="distribuidor"?data.distributorId??null:null,
    currency: data.currency,
    lines, subtotal, taxes, total,
    notes: data.notes ?? null,
    status: data.channel==="distribuidor" ? "Registrado_distribuidor" : "Borrador",
    createdAt: now,
    lastUpdated: now,
    responsibleId: user.id,
  });

  return { ok:true, id: ref.id, accountId };
}
