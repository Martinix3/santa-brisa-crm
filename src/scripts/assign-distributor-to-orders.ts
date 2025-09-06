// To run this script: npx tsx src/scripts/assign-distributor-to-orders.ts
// IMPORTANT: This is a one-time script to assign a default distributor to existing orders.

import { initializeApp, getApps, App, type AppOptions, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, WriteBatch, CollectionReference, query, where } from 'firebase-admin/firestore';
import { VALID_SALE_STATUSES } from '../lib/constants';

// --- Admin SDK Initialization ---
let db: FirebaseFirestore.Firestore;
try {
  const ADMIN_APP_NAME = 'firebase-admin-script-distributor-assign';
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


const DISTRIBUTOR_NAME = "Importaciones Cuesta";
const ACCOUNTS_COLLECTION = 'accounts';
const ORDERS_COLLECTION = 'orders';
const MIGRATION_FLAG_DOC = 'assignDefaultDistributor_20240801';

async function assignDistributor() {
  console.log(`Starting script to assign distributor "${DISTRIBUTOR_NAME}" to existing orders...`);
  
  const flagRef = db.collection('migrationFlags').doc(MIGRATION_FLAG_DOC);
  const flagSnap = await flagRef.get();
  if (flagSnap.exists) {
      console.log(`-> This script version (${MIGRATION_FLAG_DOC}) has already been run. Aborting.`);
      return;
  }

  // 1. Find the distributor's account ID
  const distributorQuery = query(db.collection(ACCOUNTS_COLLECTION), where("nombre", "==", DISTRIBUTOR_NAME));
  const distributorSnapshot = await distributorQuery.get();

  if (distributorSnapshot.empty) {
    console.error(`❌ ERROR: Distributor "${DISTRIBUTOR_NAME}" not found in the accounts collection. Please ensure the distributor exists with the exact name.`);
    return;
  }
  const distributorId = distributorSnapshot.docs[0].id;
  console.log(`✅ Found distributor "${DISTRIBUTOR_NAME}" with ID: ${distributorId}`);

  // 2. Find all relevant orders without a distributorId
  const ordersToUpdateQuery = query(
    db.collection(ORDERS_COLLECTION), 
    where("distributorId", "==", null)
  );
  
  const ordersSnapshot = await ordersToUpdateQuery.get();

  if (ordersSnapshot.empty) {
    console.log("✅ No orders found that need a distributor assignment. All good!");
    return;
  }

  console.log(`Found ${ordersSnapshot.size} orders to update.`);

  // 3. Update all found orders in a batch
  const batch = db.batch();
  let updatedCount = 0;
  ordersSnapshot.forEach(doc => {
    // We only update orders that are actual sales, not follow-ups or scheduled tasks
    const orderData = doc.data();
    if (VALID_SALE_STATUSES.includes(orderData.status)) {
        const orderRef = db.collection(ORDERS_COLLECTION).doc(doc.id);
        batch.update(orderRef, { distributorId: distributorId });
        updatedCount++;
    }
  });

  if (updatedCount === 0) {
      console.log("No orders in a valid sale status were found to update.");
      return;
  }

  try {
    await batch.commit();
    console.log(`✅ Successfully updated ${updatedCount} orders with the new distributor ID.`);
    
    // 4. Set migration flag
    await flagRef.set({
        runAt: Timestamp.now(),
        updatedCount: updatedCount,
        distributorId: distributorId,
        distributorName: DISTRIBUTOR_NAME
    });
    console.log(`Migration flag "${MIGRATION_FLAG_DOC}" set.`);

  } catch (error) {
    console.error("❌ Error committing the batch update:", error);
  }
}

assignDistributor().catch(console.error);
