
'use server';

import { getInventoryItemsFS } from '@/services/inventory-item-service';
import { getCostCentersFS } from '@/services/costcenter-service';
import type { InventoryItem, CostCenter } from '@/types';

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

export async function getCostCentersAction(): Promise<CostCenter[]> {
    try {
        const items = await getCostCentersFS();
        return items;
    } catch (error) {
        console.error("Error in getCostCentersAction:", error);
        throw new Error("Failed to fetch cost centers via server action.");
    }
}
