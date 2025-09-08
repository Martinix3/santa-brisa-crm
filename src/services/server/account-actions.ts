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
    // The data received from Firestore is already mapped in getAccountsFS,
    // but we can ensure it's JSON-serializable here if needed, although
    // fromFirestore should already handle Timestamp conversions.
    return JSON.parse(JSON.stringify(accounts));
  } catch (error) {
    console.error("Error in getAccountsAction:", error);
    // In a real application, you might want to log this error to a monitoring service.
    // Re-throwing the error to let the client-side error boundary catch it.
    throw new Error("Failed to fetch accounts. Please check server logs for details.");
  }
}
