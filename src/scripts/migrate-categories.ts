// To run this script: npx tsx src/scripts/migrate-categories.ts
// IMPORTANT: This is a one-time script. Backup your Firestore data before running.

import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch, query, where, limit, updateDoc } from 'firebase/firestore';

const INVENTORY_COLLECTION = 'inventoryItems';
const CATEGORIES_COLLECTION = 'categories';

// Helper function to find a category by name, ignoring case and extra spaces.
async function findCategoryByName(name: string) {
    const categoriesRef = collection(db, CATEGORIES_COLLECTION);
    const snapshot = await getDocs(categoriesRef);
    const normalizedName = name.trim().toLowerCase();
    
    for (const doc of snapshot.docs) {
        const categoryData = doc.data();
        if (categoryData.name && categoryData.name.trim().toLowerCase() === normalizedName) {
            return { id: doc.id, ...categoryData };
        }
    }
    return null;
}

async function migrate() {
    console.log("Starting script to assign categories to uncategorized inventory items...");

    // Find the ID for "Materia Prima (COGS)". This is a safer default.
    const defaultCategory = await findCategoryByName("Materia Prima (COGS)");

    if (!defaultCategory) {
        console.error("CRITICAL ERROR: Default category 'Materia Prima (COGS)' not found.");
        console.error("Please ensure this category exists in your 'categories' collection before running the script.");
        return;
    }

    console.log(`Found default category: ${defaultCategory.name} (ID: ${defaultCategory.id})`);

    const batch = writeBatch(db);
    let updatedCount = 0;

    // Query for all inventory items that DO NOT have a categoryId or it is null/empty.
    const inventoryQuery = query(collection(db, INVENTORY_COLLECTION));
    const inventorySnapshot = await getDocs(inventoryQuery);

    console.log(`Found ${inventorySnapshot.size} total inventory items. Checking for uncategorized items...`);
    
    inventorySnapshot.forEach(doc => {
        const data = doc.data();
        if (!data.categoryId) {
            console.log(`  - Updating item: "${data.name}" (ID: ${doc.id}) with default category.`);
            batch.update(doc.ref, { categoryId: defaultCategory.id });
            updatedCount++;
        }
    });

    if (updatedCount === 0) {
        console.log("No uncategorized items found. Migration is not needed.");
        return;
    }

    try {
        await batch.commit();
        console.log(`Migration successful! ${updatedCount} inventory items were updated.`);
    } catch (error) {
        console.error("Error committing batch:", error);
    }
}

migrate().catch(error => {
    console.error("An unexpected error occurred during migration:", error);
});
