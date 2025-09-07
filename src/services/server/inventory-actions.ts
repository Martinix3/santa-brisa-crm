
'use server';

import { getInventoryItemsFS } from '@/services/inventory-item-service';
import type { InventoryItem } from '@/types';

export async function getInventoryItemsAction(): Promise<InventoryItem[]> {
  try {
    const items = await getInventoryItemsFS();
    return items;
  } catch (error) {
    console.error("Error in getInventoryItemsAction:", error);
    // En lugar de devolver un array vacío, que podría ocultar el error,
    // es mejor relanzar el error para que el cliente pueda manejarlo.
    throw new Error("Failed to fetch inventory items via server action.");
  }
}
