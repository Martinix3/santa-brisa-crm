"use server";

import { getAccountDebugInfo } from "@/services/account-debugger-service";

export async function getAccountDebugInfoAction(accountId: string) {
  try {
    const debugInfo = await getAccountDebugInfo(accountId);
    // Data is already fetched using the admin SDK, so it's serializable
    return debugInfo;
  } catch (error) {
    console.error(`Error in getAccountDebugInfoAction for account ${accountId}:`, error);
    if (error instanceof Error) {
        throw new Error(error.message);
    }
    throw new Error("An unknown error occurred while debugging the account.");
  }
}
