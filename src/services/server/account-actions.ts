'use server';

import { getAccountsFS } from '@/services/account-service';
import type { Account } from '@/types';

/**
 * Server Action to fetch all accounts from Firestore.
 * This function is intended to be called from client components.
 */
export async function getAccountsAction(): Promise<Account[]> {
  try {
    const accounts = await getAccountsFS();
    // The data is already serializable because all services now use the Admin SDK and return plain objects/dates.
    return accounts;
  } catch (error) {
    console.error("Error in getAccountsAction:", error);
    // In a real application, you might want to log this error to a monitoring service.
    // Re-throwing the error to let the client-side error boundary catch it.
    throw new Error("Failed to fetch accounts. Please check server logs for details.");
  }
}
