
// To run this script: npx tsx src/scripts/migrate-categories.ts
// IMPORTANT: This is a one-time script. Backup your Firestore data before running.

import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch, query, doc } from 'firebase/firestore';
import type { CategoryKind } from '../types';

const CATEGORIES_COLLECTION = 'categories';
const PURCHASES_COLLECTION = 'purchases';
const MATERIALS_COLLECTION = 'promotionalMaterials';

async function migrate() {
    console.log("Starting category migration script...");
    const batch = writeBatch(db);

    const categoriesMap = new Map<string, { id: string, kind: CategoryKind, name: string }>();

    // Step 1: Read unique categories from Purchases
    console.log("Reading from Purchases...");
    const purchasesSnapshot = await getDocs(collection(db, PURCHASES_COLLECTION));
    purchasesSnapshot.forEach(doc => {
        const categoryName = doc.data().category;
        if (categoryName && !categoriesMap.has(categoryName)) {
            categoriesMap.set(categoryName, { id: '', kind: 'cost', name: categoryName });
        }
    });

    // Step 2: Read unique types from Promotional Materials
    console.log("Reading from Promotional Materials...");
    const materialsSnapshot = await getDocs(collection(db, MATERIALS_COLLECTION));
    materialsSnapshot.forEach(doc => {
        const typeName = doc.data().type;
        if (typeName && !categoriesMap.has(typeName)) {
            categoriesMap.set(typeName, { id: '', kind: 'inventory', name: typeName });
        }
    });

    // Step 3: Create new category documents
    console.log(`Found ${categoriesMap.size} unique categories to create.`);
    for (const [name, categoryData] of categoriesMap.entries()) {
        const newCategoryRef = doc(collection(db, CATEGORIES_COLLECTION));
        categoryData.id = newCategoryRef.id;
        batch.set(newCategoryRef, {
            name: categoryData.name,
            kind: categoryData.kind,
            isConsumable: true, // Default to true, adjust manually if needed
        });
        console.log(`  - Queued creation for category: ${name} (ID: ${newCategoryRef.id})`);
    }

    // Step 4: Update existing documents with categoryId
    console.log("Updating Purchases with new category IDs...");
    purchasesSnapshot.forEach(doc => {
        const categoryName = doc.data().category;
        if (categoryName && categoriesMap.has(categoryName)) {
            const categoryId = categoriesMap.get(categoryName)!.id;
            batch.update(doc.ref, { categoryId: categoryId, category: null }); // Set categoryId and nullify old field
        }
    });

    console.log("Updating Promotional Materials with new category IDs...");
    materialsSnapshot.forEach(doc => {
        const typeName = doc.data().type;
        if (typeName && categoriesMap.has(typeName)) {
            const categoryId = categoriesMap.get(typeName)!.id;
            batch.update(doc.ref, { categoryId: categoryId, type: null }); // Set categoryId and nullify old field
        }
    });

    try {
        await batch.commit();
        console.log("Migration successful! Batch committed.");
    } catch (error) {
        console.error("Error committing batch:", error);
    }

    // process.exit(0); This line can be problematic in some environments
}

migrate();
