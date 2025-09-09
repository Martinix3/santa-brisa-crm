

'use server';

import { adminDb as db } from "@/lib/firebaseAdmin";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase-admin/firestore";
import type { Account, Order } from '@/types';
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
  let accountsQuery: FirebaseFirestore.Query = db.collection("accounts");
  if (accountStageIn && accountStageIn.length > 0) {
    accountsQuery = accountsQuery.where("accountStage", "in", accountStageIn.slice(0, 10));
  }
  if (accountTypeIn && accountTypeIn.length > 0) {
    accountsQuery = accountsQuery.where("accountType", "in", accountTypeIn.slice(0, 10));
  }
  
  const accountsSnap = await accountsQuery.get();
  const accounts = accountsSnap.docs.map(d => fromFirestore({ id: d.id, ...d.data() }));

  const accountsById = new Map<string, Account>();
  const accountsByName = new Map<string, Account>();
  accounts.forEach(a => {
    accountsById.set(a.id, a);
    if (a.name) {
      accountsByName.set(a.name.toLowerCase().trim(), a);
    }
  });

  // 2. Fetch all orders (interactions are a subset of orders).
  const ordersQuery: FirebaseFirestore.Query = db.collection("orders");
  const ordersSnap = await ordersQuery.get();
  const allInteractions = ordersSnap.docs.map(fromFirestoreOrder);

  // 3. Create sets of account IDs based on activity.
  const accountIdsWithOrder = new Set<string>();
  const accountIdsWithInteraction = new Set<string>();
  
  allInteractions.forEach(interaction => {
    let accountId = interaction.accountId;
    // Fallback to name matching if accountId is missing
    if (!accountId && interaction.clientName) {
        const matchedAccount = accountsByName.get(interaction.clientName.toLowerCase().trim());
        if (matchedAccount) {
            accountId = matchedAccount.id;
        }
    }

    if (accountId) {
      accountIdsWithInteraction.add(accountId);
      if (VALID_SALE_STATUSES.includes(interaction.status)) {
        accountIdsWithOrder.add(accountId);
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
    
    if (isFallida && !hasOrder) { 
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
