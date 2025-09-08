
'use server';

import { adminDb as db } from "@/lib/firebaseAdmin";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase-admin/firestore";
import type { Account } from '@/types';
import { fromFirestore } from '@/services/account-mapper';
import { fromFirestoreOrder } from '@/services/order-service';
import { VALID_SALE_STATUSES } from '@/lib/constants';

type DateRange = { from?: Date; to?: Date };

export type SelectAccountsOptions = {
  ordersRange?: DateRange;
  interactionsRange?: DateRange;
  accountStageIn?: string[];
  accountTypeIn?: string[];
  onlyIds?: boolean;
};

// Main server action
export async function selectAccountsByActivity(opts: SelectAccountsOptions = {}) {
  const {
    ordersRange,
    interactionsRange,
    accountStageIn,
    accountTypeIn,
    onlyIds = false,
  } = opts;

  // 1. Fetch all accounts applying primary filters.
  const accountsCol = db.collection("accounts");
  const accountPredicates: any[] = [];
  if (accountStageIn && accountStageIn.length > 0) {
    accountPredicates.push(where("accountStage", "in", accountStageIn.slice(0, 10)));
  }
  if (accountTypeIn && accountTypeIn.length > 0) {
    accountPredicates.push(where("accountType", "in", accountTypeIn.slice(0, 10)));
  }
  const qAccounts = accountPredicates.length ? query(accountsCol, ...accountPredicates) : accountsCol;
  
  const accountsSnap = await getDocs(qAccounts);
  const accounts = accountsSnap.docs.map(d => fromFirestore({ id: d.id, ...d.data() }));

  const accountsById = new Map<string, Account>();
  accounts.forEach(a => accountsById.set(a.id, a));

  // 2. Fetch all orders (interactions are a subset of orders).
  const ordersCol = db.collection("orders");
  const orderPredicates: any[] = [];
  if (ordersRange?.from || interactionsRange?.from) {
    const fromDate = ordersRange?.from || interactionsRange?.from;
    orderPredicates.push(where("createdAt", ">=", Timestamp.fromDate(fromDate!)));
  }
  if (ordersRange?.to || interactionsRange?.to) {
    const toDate = ordersRange?.to || interactionsRange?.to;
    orderPredicates.push(where("createdAt", "<=", Timestamp.fromDate(toDate!)));
  }
  const qOrders = orderPredicates.length ? query(ordersCol, ...orderPredicates) : ordersCol;
  const ordersSnap = await getDocs(qOrders);
  const allInteractions = ordersSnap.docs.map(fromFirestoreOrder);

  // 3. Create sets of account IDs based on activity.
  const accountIdsWithOrder = new Set<string>();
  const accountIdsWithInteraction = new Set<string>();
  
  allInteractions.forEach(interaction => {
    if (interaction.accountId) {
      accountIdsWithInteraction.add(interaction.accountId);
      if (VALID_SALE_STATUSES.includes(interaction.status)) {
        accountIdsWithOrder.add(interaction.accountId);
      }
    }
  });

  // 4. Partition accounts into groups.
  const conPedidoIds: string[] = [];
  const sinPedidoConInteraccionIds: string[] = [];
  const fallidasIds: string[] = [];
  const sinPedidoNiInteraccionIds: string[] = [];
  
  accounts.forEach(a => {
    const hasOrder = accountIdsWithOrder.has(a.id);
    const hasInteraction = accountIdsWithInteraction.has(a.id);
    const isFallida = a.status === 'Fallido' || a.status === 'Inactivo';

    if (hasOrder) {
      conPedidoIds.push(a.id);
    } else if (hasInteraction) {
      sinPedidoConInteraccionIds.push(a.id);
    } else {
      sinPedidoNiInteraccionIds.push(a.id);
    }
    
    if (isFallida) {
      fallidasIds.push(a.id);
    }
  });

  // 5. Map IDs back to full account objects if needed.
  const mapBack = (ids: string[]) =>
    onlyIds ? ids : ids.map(id => accountsById.get(id)).filter(Boolean) as Account[];

  return {
    conPedido: mapBack(conPedidoIds),
    sinPedidoConInteraccion: mapBack(sinPedidoConInteraccionIds),
    fallidas: mapBack(fallidasIds),
    sinPedidoNiInteraccion: mapBack(sinPedidoNiInteraccionIds),
    meta: {
      totalCuentasConsideradas: accounts.length,
      totalConPedido: conPedidoIds.length,
      totalSinPedidoConInteraccion: sinPedidoConInteraccionIds.length,
      totalFallidas: fallidasIds.length,
      totalSinPedidoNiInteraccion: sinPedidoNiInteraccionIds.length,
    },
  };
}
