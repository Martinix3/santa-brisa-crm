
'use server';

import { getInventoryItemsFS } from '@/services/inventory-item-service';
import type { InventoryItem } from '@/types';

export async function getInventoryItemsAction(): Promise<InventoryItem[]> {
  try {
    const items = await getInventoryItemsFS();
    return items;
  } catch (error) {
    console.error("Error in getInventoryItemsAction:", error);
    // En un caso real, podrías querer manejar este error de forma más específica.
    // Por ahora, lo relanzamos para que el cliente pueda manejarlo.
    throw new Error("Failed to fetch inventory items via server action.");
  }
}
