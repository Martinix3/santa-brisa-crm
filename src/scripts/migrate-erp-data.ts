
// To run this script: npx tsx src/scripts/migrate-erp-data.ts
// WARNING: THIS IS A DESTRUCTIVE SCRIPT. It will wipe and re-seed all ERP-related data.
// It WILL NOT touch CRM data (accounts, orders, teamMembers, events).
// Ensure you have backed up your data if you have any important information in the affected collections.

import { initializeApp, getApps, App, type AppOptions, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, WriteBatch, CollectionReference } from 'firebase-admin/firestore';
import { mockCategories, mockTanks } from '../lib/data';

// --- Admin SDK Initialization ---
let db: FirebaseFirestore.Firestore;
try {
  const ADMIN_APP_NAME = 'firebase-admin-script-runner-erp';
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


// Collections to be wiped and re-seeded
const COLLECTIONS_TO_RESET = [
  'categories',
  'inventoryItems',
  'itemBatches',
  'stockTxns',
  'purchases',
  'suppliers',
  'productionRuns',
  'tanks',
  'bomLines',
  'productCostSnapshots',
  'counters', // Reset counters for SKUs and codes
];

// Collections to be PROTECTED
const PROTECTED_COLLECTIONS = new Set([
  'accounts',
  'orders',
  'teamMembers',
  'events',
  'directSales',
  'sampleRequests',
  'stickyNotes',
  'migrationFlags', // Keep migration flags to avoid re-running other scripts
]);

async function wipeCollections() {
  console.log("Starting Phase 1: Wiping collections...");
  for (const collectionName of COLLECTIONS_TO_RESET) {
    if (PROTECTED_COLLECTIONS.has(collectionName)) {
      console.error(`\nFATAL: Attempted to delete a protected collection: "${collectionName}". Aborting.`);
      throw new Error(`Attempted to delete a protected collection: "${collectionName}"`);
    }

    const collectionRef = db.collection(collectionName);
    let snapshot;
    let docsDeleted = 0;

    console.log(`  - Wiping collection: "${collectionName}"...`);
    
    // Process in batches of 500 until the collection is empty
    do {
      snapshot = await collectionRef.limit(500).get();
      if (snapshot.size === 0) {
        break; // Exit loop if collection is empty
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      docsDeleted += snapshot.size;
      console.log(`    ...deleted ${snapshot.size} documents.`);

    } while (snapshot.size > 0);
    
    console.log(`  - Finished wiping "${collectionName}". Total documents deleted: ${docsDeleted}.`);
  }
}

async function seedData() {
  console.log("\nStarting Phase 2: Seeding new data...");
  const batch = db.batch();

  // Seed Categories from lib/data.ts using the specified idOverride as document ID
  console.log("  - Seeding categories...");
  mockCategories.forEach(category => {
    const { idOverride, ...categoryData } = category;
    const docRef = db.collection('categories').doc(idOverride!); // Use the explicit ID
    batch.set(docRef, { ...categoryData, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  });

  // Seed Tanks from lib/data.ts
  console.log("  - Seeding tanks...");
  mockTanks.forEach(tank => {
    const docRef = db.collection('tanks').doc();
    batch.set(docRef, { ...tank, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  });

  await batch.commit();
  console.log("Data seeding committed successfully.");
}

async function runMigration() {
  try {
    console.log("Starting ERP data reset and seeding script...");
    console.warn("⚠️  WARNING: This will delete data from the following collections:", COLLECTIONS_TO_RESET.join(', '));
    
    // PHASE 1: WIPE COLLECTIONS
    await wipeCollections();

    // PHASE 2: SEED NEW DATA
    await seedData();
    
    // Set a flag to indicate completion
    const flagRef = db.collection('migrationFlags').doc('erpReset_20240731');
    await flagRef.set({ runAt: Timestamp.now() });

    console.log("\n✅✅✅ Migration successful! ERP data has been reset and re-seeded.");
    console.log("Please restart your development server to see the changes if needed.");

  } catch (error) {
    console.error("\n❌❌❌ An error occurred during the migration process:", error);
    console.error("The migration failed. Your data might be in an inconsistent state.");
    process.exit(1);
  }
}

runMigration();
