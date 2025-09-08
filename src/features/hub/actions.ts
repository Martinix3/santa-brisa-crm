"use server";

import { getAccountsFS } from "@/services/account-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import type { InventoryItem } from "@/types";

type HubData = {
  distributors: { id: string; name: string }[];
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
      .filter((a) => a.type === "distributor" || a.type === "importer")
      .map((a) => ({ id: a.id, name: a.name }));
    
    const inventoryItems = params?.inventoryKind
        ? allInventoryItems.filter(i => (i.categoryId) === params.inventoryKind)
        : allInventoryItems;

    return {
      distributors,
      inventoryItems,
    };
  } catch (error) {
    console.error("Error fetching data for Hub Dialog:", error);
    // En una app real, podrías loggear esto a un servicio de monitoreo
    return { distributors: [], inventoryItems: [] };
  }
}
