
"use server";

import { getAccountsFS } from "@/services/account-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import type { InventoryItem, Account } from "@/types";

type HubData = {
  distributors: Account[];
  inventoryItems: InventoryItem[];
};

export async function getHubDialogDataAction(params?: {
  inventoryKind?: "product" | "plv";
}): Promise<HubData> {
  try {
    const [allAccounts, allInventoryItems] = await Promise.all([
      getAccountsFS(),
      getInventoryItemsFS(),
    ]);

    const distributors = allAccounts
      .filter((a) => a.type === "Distribuidor" || a.type === "Importador");
    
    // Filtering on the client now, so we return all items
    const inventoryItems = allInventoryItems;

    return {
      distributors,
      inventoryItems,
    };
  } catch (error) {
    console.error("Error fetching data for Hub Dialog:", error);
    return { distributors: [], inventoryItems: [] };
  }
}
