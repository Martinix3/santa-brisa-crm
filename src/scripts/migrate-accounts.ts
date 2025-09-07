
// To run this script: npx tsx src/scripts/migrate-accounts.ts
// IMPORTANT: This script will update the 'accounts' collection to the new data model.
// It is designed to be idempotent.

import { initializeApp, getApps, type AppOptions, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, WriteBatch, CollectionReference } from 'firebase-admin/firestore';
import type { UserRole as NewUserRole, Account as NewAccount, PotencialType, AccountStatus, AccountType } from '../types';

// --- Admin SDK Initialization ---
let db: FirebaseFirestore.Firestore;
try {
  const ADMIN_APP_NAME = 'firebase-admin-script-migrate-accounts';
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


const ACCOUNTS_COLLECTION = 'accounts';
const MIGRATION_FLAG_DOC = 'migrateAccounts_v1_20240802';

function mapOldTypeToNewType(oldType: string): AccountType {
    const mapping: Record<string, AccountType> = {
        'HORECA': 'customer',
        'Distribuidor': 'distributor',
        'Importador': 'importer',
        'Retail Minorista': 'customer',
        'Gran Superficie': 'customer',
        'Cliente Final Directo': 'customer',
        'Evento Especial': 'prospect',
        'Otro': 'prospect',
    };
    return mapping[oldType] || 'prospect';
}

function calculateLeadScore(status: AccountStatus, potencial: PotencialType): number {
    let score = 0;
    switch (status) {
        case 'active': score = 75; break;
        case 'qualified': score = 60; break;
        case 'lead': score = 50; break;
        case 'dormant': score = 30; break;
        case 'lost': score = 10; break;
        default: score = 20;
    }
    switch (potencial) {
        case 'alto': score += 15; break;
        case 'medio': score += 10; break;
        case 'bajo': score += 5; break;
    }
    return Math.min(100, score);
}


async function migrateAccounts() {
  console.log("Starting script to migrate 'accounts' collection...");
  
  const flagRef = db.collection('migrationFlags').doc(MIGRATION_FLAG_DOC);
  const flagSnap = await flagRef.get();
  if (flagSnap.exists) {
      console.log(`-> This script version (${MIGRATION_FLAG_DOC}) has already been run. Aborting.`);
      return;
  }

  const accountsRef = db.collection(ACCOUNTS_COLLECTION);
  const snapshot = await accountsRef.get();

  if (snapshot.empty) {
    console.log("No accounts found. Nothing to migrate.");
    return;
  }

  console.log(`Found ${snapshot.size} accounts to check for migration.`);

  const batch = db.batch();
  let updatedCount = 0;

  snapshot.forEach(doc => {
    const oldData = doc.data();
    let needsUpdate = false;

    // --- Create the new structure with defaults ---
    const newData: Partial<NewAccount> = {
      name: oldData.nombre || oldData.name || 'Nombre Desconocido',
      type: mapOldTypeToNewType(oldData.type),
      status: 'lead', // Default status, can be recalculated later
      channel: 'horeca', // Default channel
      distribution_type: oldData.distributorId ? 'via_distributor' : 'direct',
      distributor_id: oldData.distributorId || null,
      owner_user_id: oldData.salesRepId || oldData.responsableId || null,
      vat_number: oldData.cif || null,
      billing_address: oldData.addressBilling || null,
      shipping_address: oldData.addressShipping || null,
      city: oldData.ciudad || oldData.addressBilling?.city || oldData.addressShipping?.city || null,
      region: oldData.addressBilling?.province || oldData.addressShipping?.province || null,
      country: oldData.addressBilling?.country || oldData.addressShipping?.country || 'España',
      next_action: oldData.nextAction || null,
      next_action_date: oldData.nextActionDate ? Timestamp.fromDate(new Date(oldData.nextActionDate)) : null,
      updatedAt: Timestamp.now(),
    };
    
    newData.lead_score = calculateLeadScore(newData.status!, oldData.potencial || 'bajo');
    newData.sb_score = newData.lead_score; // For now, sb_score can be the same as lead_score

    // --- Compare with existing data to see if an update is needed ---
    for (const key in newData) {
        if ((newData as any)[key] !== (oldData as any)[key]) {
            needsUpdate = true;
            break;
        }
    }
    
    // Also check for fields that need to be removed (set to null)
    const oldFieldsToRemove = ['potencial', 'responsableId', 'nombre', 'ciudad', 'salesRepId', 'addressBilling', 'addressShipping', 'nextAction'];
    for(const oldKey of oldFieldsToRemove){
        if(oldData[oldKey] !== undefined){
            newData[oldKey] = null; // Use null to remove the field via merge
            needsUpdate = true;
        }
    }


    if (needsUpdate) {
        console.log(`  - Migrating account "${newData.name}" (ID: ${doc.id}).`);
        batch.set(doc.ref, newData, { merge: true }); // Use merge to add/update fields and nullify old ones
        updatedCount++;
    }
  });

  if (updatedCount === 0) {
      console.log("No accounts needed updating. All seem to be current.");
  } else {
    try {
      await batch.commit();
      console.log(`✅ Successfully migrated ${updatedCount} accounts.`);
    } catch (error) {
      console.error("❌ Error committing the batch update:", error);
      return; 
    }
  }
  
  await flagRef.set({
      runAt: Timestamp.now(),
      updatedCount: updatedCount,
  });
  console.log(`Migration flag "${MIGRATION_FLAG_DOC}" set.`);
}

migrateAccounts().catch(console.error);
