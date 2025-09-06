
// To run this script: npx tsx src/scripts/migrate-categories.ts
// IMPORTANT: This script will reset and seed the categories collection based on the definitions in src/lib/data.ts
// It is idempotent and safe to run multiple times, but it will overwrite existing categories.

import { initializeApp, getApps, App, type AppOptions, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, WriteBatch, CollectionReference } from 'firebase-admin/firestore';
import { mockCategories } from '../lib/data';

// --- Admin SDK Initialization ---
let db: FirebaseFirestore.Firestore;
try {
  const ADMIN_APP_NAME = 'firebase-admin-script-runner';
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


const CATEGORIES_COLLECTION = 'categories';
const MIGRATION_FLAG_DOC = 'migrateCategories_v2_2024_07_31';

async function deleteCollection(collectionRef: CollectionReference) {
    let snapshot;
    do {
      snapshot = await collectionRef.limit(500).get();
      if (snapshot.size === 0) {
        break; // Exit loop if collection is empty
      }
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      console.log(`  - Deleting batch of ${snapshot.size} documents...`);
      await batch.commit();
    } while (snapshot.size > 0);
    
    console.log(`  - Finished wiping "${collectionRef.id}".`);
}

async function seedCategories() {
    console.log("Starting script to reset and seed categories...");
    
    const flagRef = db.collection('migrationFlags').doc(MIGRATION_FLAG_DOC);
    const flagSnap = await flagRef.get();
    if (flagSnap.exists) {
        console.log(`-> This script version (${MIGRATION_FLAG_DOC}) has been run before. To re-run, delete the flag document in Firestore.`);
        return;
    }
    
    const categoriesRef = db.collection(CATEGORIES_COLLECTION);

    // 1. Delete all existing documents in the collection
    console.log(`Wiping collection: "${CATEGORIES_COLLECTION}"...`);
    await deleteCollection(categoriesRef);
    console.log("Collection wiped.");

    // 2. Add new categories from mockCategories in data.ts
    const seedBatch = db.batch();
    console.log(`Seeding ${mockCategories.length} new categories...`);
    mockCategories.forEach(category => {
        const { idOverride, ...categoryData } = category;
        const docRef = categoriesRef.doc(idOverride!);
        
        const dataToSave = {
            ...categoryData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        seedBatch.set(docRef, dataToSave);
    });

    // 3. Commit the seed batch
    try {
        await seedBatch.commit();
        console.log("✅ Successfully reset and seeded the categories collection.");
        
        // 4. Set migration flag
        await flagRef.set({
            runAt: Timestamp.now(),
            seededCount: mockCategories.length
        });
        console.log(`Migration flag "${MIGRATION_FLAG_DOC}" set.`);
        
    } catch (error) {
        console.error("❌ Error committing seed batch:", error);
    }
}

seedCategories().catch(console.error);
