
'use server';

import { getAccountsFS } from '@/services/account-service';
import { getOrdersFS } from '@/services/order-service';
import { getTeamMembersFS } from '@/services/team-member-service';
import type { Account, Order, TeamMember } from '@/types';

/**
 * Server Action to fetch all data required for the Accounts page.
 * This function is intended to be called from client components.
 */
export async function getAccountsAction(): Promise<{ accounts: Account[], orders: Order[], teamMembers: TeamMember[] }> {
  try {
    const [accounts, orders, teamMembers] = await Promise.all([
      getAccountsFS(),
      getOrdersFS(),
      getTeamMembersFS(['Ventas', 'Admin', 'Clavadista', 'Líder Clavadista'])
    ]);
    
    // Data is already serializable because services use the Admin SDK
    return { accounts, orders, teamMembers };
  } catch (error) {
    console.error("Error in getAccountsAction:", error);
    // Re-throwing the error to let the client-side error boundary catch it.
    throw new Error("Failed to fetch accounts data. Please check server logs for details.");
  }
}
