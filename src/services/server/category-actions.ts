
'use server';

import { getCategoriesFS } from '@/services/category-service';
import type { Category } from '@/types';

/**
 * Server Action to fetch all categories from Firestore.
 * This is safe to call from client components.
 */
export async function getCategoriesAction(): Promise<Category[]> {
  try {
    const categories = await getCategoriesFS();
    // The data fetched with the admin SDK is serializable by default.
    return categories;
  } catch (error) {
    console.error("Error in getCategoriesAction:", error);
    throw new Error("Failed to fetch categories. Please check server logs.");
  }
}
