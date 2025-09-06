
'use server';

import { getInventoryItemsFS } from '@/services/inventory-item-service';
import type { InventoryItem } from '@/types';

export async function getInventoryItemsAction(): Promise<InventoryItem[]> {
  try {
    const items = await getInventoryItemsFS();
    return items;
  } catch (error) {
    console.error("Error in getInventoryItemsAction:", error);
    // In a real scenario, you might want to handle this error more specifically.
    // For now, let's re-throw it so the client can handle it.
    throw new Error("Failed to fetch inventory items via server action.");
  }
}
