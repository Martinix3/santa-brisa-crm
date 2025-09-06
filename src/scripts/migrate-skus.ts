
// To run this script: npx tsx src/scripts/migrate-skus.ts
// IMPORTANT: This is a one-time script. Backup your Firestore data before running.

import { initializeApp, getApps, App, type AppOptions, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Category, InventoryItem } from '../types';

// --- Admin SDK Initialization ---
let db: FirebaseFirestore.Firestore;
try {
  const ADMIN_APP_NAME = 'firebase-admin-script-runner-sku';
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existingApp) {
    db = getFirestore(existingApp);
  } else {
    const appOptions: AppOptions = {
      credential: applicationDefault(),
      projectId: process.env.GCLOUD_PROJECT || 'santa-brisa-crm',
    };
    const newApp = initializeApp(appOptions, ADMIN_APP_NAME);
    db = getFirestore(newApp);
  }
} catch (error: any) {
  console.error("Firebase Admin SDK initialization error:", error);
  throw new Error("Failed to initialize Firebase Admin SDK for script execution.");
}

// --- Logic replicated from lib/coding.ts for Admin SDK compatibility ---

function getSkuPrefix(categoryName: string): string {
    const normalizedName = (categoryName || '').trim().toLowerCase();
    if (normalizedName.includes('materia prima')) return 'RM';
    if (normalizedName.includes('embalaje')) return 'PK';
    if (normalizedName.includes('producto terminado')) return 'FG';
    if (normalizedName.includes('granel') || normalizedName.includes('intermedio')) return 'BLK';
    if (normalizedName.includes('promocional') || normalizedName.includes('merchandising') || normalizedName.includes('plv')) return 'PM';
    if (normalizedName.includes('servicio')) return 'SVC';
    return 'OTH';
}

function getSkuIdentifier(itemName: string, prefix: string): string {
    const cleanName = (itemName || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (prefix === 'FG' || prefix === 'BLK') {
        return cleanName.slice(0, 5).padEnd(5, 'X');
    }
    return cleanName.slice(0, 3).padEnd(3, 'X');
}

async function getNextSeq(key: string, digits = 4): Promise<string> {
    if (!key) throw new Error("A key must be provided for the sequence counter.");
    const ref = db.collection('counters').doc(key);
    
    const newVal = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? (snap.data()?.value as number) : 0;
      const next = current + 1;
      tx.set(ref, { value: next, updatedAt: Timestamp.now() }, { merge: true });
      return next;
    });

    return newVal.toString().padStart(digits, '0');
}

async function generateSkuForMigration(name: string, category: Category): Promise<string> {
    const prefix = getSkuPrefix(category.name);
    const identifier = getSkuIdentifier(name, prefix);
    const counterKey = `sku-${prefix}-${identifier}`;
    const sequence = await getNextSeq(counterKey, 4);
    return `${prefix}-${identifier}-${sequence}`;
}

// --- Main Migration Logic ---

async function migrateSkus() {
    console.log("Starting SKU migration script...");
    
    // 1. Idempotency Check
    const flagDocRef = db.collection('migrationFlags').doc('skuMigrationProfessional_20240728');
    const flagDoc = await flagDocRef.get();
    if (flagDoc.exists) {
        console.log("🚫 Migration script has already been run on:", flagDoc.data()?.runAt.toDate());
        return;
    }

    // 2. Fetch all necessary data
    console.log("Fetching categories and inventory items...");
    const categoriesSnapshot = await db.collection('categories').get();
    const categoriesMap = new Map<string, Category>();
    categoriesSnapshot.forEach(doc => {
        categoriesMap.set(doc.id, { id: doc.id, ...doc.data() } as Category);
    });
    console.log(`  > Found ${categoriesMap.size} categories.`);

    const itemsSnapshot = await db.collection('inventoryItems').get();
    console.log(`  > Found ${itemsSnapshot.size} inventory items to process.`);

    const batch = db.batch();
    let updatedCount = 0;

    // 3. Loop and generate new SKUs
    for (const itemDoc of itemsSnapshot.docs) {
        const item = { id: itemDoc.id, ...itemDoc.data() } as InventoryItem;
        
        if (!item.categoryId) {
            console.warn(`  - ⚠️ WARNING: Item "${item.name}" (ID: ${item.id}) has no categoryId. Skipping SKU update.`);
            continue;
        }

        const category = categoriesMap.get(item.categoryId);
        if (!category) {
            console.warn(`  - ⚠️ WARNING: Category for item "${item.name}" (ID: ${item.id}, CategoryID: ${item.categoryId}) not found. Skipping SKU update.`);
            continue;
        }

        try {
            const newSku = await generateSkuForMigration(item.name, category);
            
            // We only update if the SKU is missing or different.
            if (item.sku !== newSku) {
                console.log(`  - 🔄 Updating SKU for "${item.name}": ${item.sku || '(none)'} -> ${newSku}`);
                batch.update(itemDoc.ref, { sku: newSku });
                updatedCount++;
            } else {
                 console.log(`  - ✅ SKU for "${item.name}" is already up to date. Skipping.`);
            }
        } catch (error) {
            console.error(`  - ❌ ERROR generating SKU for "${item.name}":`, error);
        }
    }

    // 4. Commit changes
    if (updatedCount > 0) {
        console.log(`\n✨ Committing ${updatedCount} SKU updates to Firestore...`);
        try {
            await batch.commit();
            console.log("✅ Batch commit successful!");
        } catch(e) {
            console.error("❌ BATCH COMMIT FAILED:", e);
            process.exit(1);
        }
    } else {
        console.log("\nNo SKU updates were necessary.");
    }

    // 5. Set the flag
    await flagDocRef.set({
        runAt: Timestamp.now(),
        updatedCount: updatedCount,
    });
    console.log("🏁 Migration flag set. Script finished successfully.");
}

// Run the script and handle top-level errors
migrateSkus().catch(error => {
    console.error("A critical error occurred during the migration process:", error);
    process.exit(1);
});
