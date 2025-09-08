
'use server';

import type { Account, Order, TeamMember, EnrichedAccount } from '@/types';
import { getAccounts, getOrdersByAccount, getTeamMembers, getRecentHistoryByAccount, getAccountById } from '@/features/accounts/repo';
import { enrichCartera } from '@/features/accounts/cartera';
import { getOrdersFS } from '@/services/order-service';

// Devuelve el bundle listo para pintar la Cartera
export async function getCarteraBundle(): Promise<{
  accounts: Account[];
  orders: Order[];
  teamMembers: TeamMember[];
  enrichedAccounts: EnrichedAccount[];
}> {
  const [accounts, orders, teamMembers] = await Promise.all([
    getAccounts(),
    getOrdersFS(),
    getTeamMembers(),
  ]);

  const enrichedAccounts = enrichCartera(accounts, orders, teamMembers);
  return { accounts, orders, teamMembers, enrichedAccounts };
}

// Historial reciente de una cuenta (para expansión lazy)
export async function getAccountHistory(accountId: string) {
  const history = await getRecentHistoryByAccount(accountId, 10);
  return history;
}
