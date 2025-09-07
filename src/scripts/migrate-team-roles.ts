// To run this script: npx tsx src/scripts/migrate-team-roles.ts
// IMPORTANT: This script will migrate the 'role' field in the teamMembers collection.

import { initializeApp, getApps, type App, type AppOptions, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, WriteBatch, CollectionReference } from 'firebase-admin/firestore';
import type { UserRole as NewUserRole, TeamMember } from '../types';

// --- Admin SDK Initialization ---
let db: FirebaseFirestore.Firestore;
try {
  const ADMIN_APP_NAME = 'firebase-admin-script-migrate-roles';
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


const TEAM_MEMBERS_COLLECTION = 'teamMembers';
const MIGRATION_FLAG_DOC = 'migrateTeamRoles_v1_20240802';

// Define the mapping from old roles to new roles
const roleMapping: Record<string, NewUserRole> = {
  'Admin': 'Admin',
  'SalesRep': 'Ventas',
  'Distributor': 'Distributor', // Remains the same
  'Clavadista': 'Marketing', // Or 'Fuerza de Ventas' if you prefer
  'Líder Clavadista': 'Manager',
  // Add any other old roles that need mapping
};


async function migrateTeamRoles() {
  console.log("Starting script to migrate team member roles...");
  
  const flagRef = db.collection('migrationFlags').doc(MIGRATION_FLAG_DOC);
  const flagSnap = await flagRef.get();
  if (flagSnap.exists) {
      console.log(`-> This script version (${MIGRATION_FLAG_DOC}) has already been run. Aborting.`);
      return;
  }

  const teamMembersRef = db.collection(TEAM_MEMBERS_COLLECTION);
  const snapshot = await teamMembersRef.get();

  if (snapshot.empty) {
    console.log("No team members found. Nothing to migrate.");
    return;
  }

  console.log(`Found ${snapshot.size} team members to check for migration.`);

  const batch = db.batch();
  let updatedCount = 0;

  snapshot.forEach(doc => {
    const member = doc.data() as TeamMember;
    const oldRole = member.role as string;
    const newRole = roleMapping[oldRole];
    
    if (newRole && oldRole !== newRole) {
      console.log(`  - Migrating user "${member.name}" from role "${oldRole}" to "${newRole}".`);
      batch.update(doc.ref, { role: newRole, updatedAt: Timestamp.now() });
      updatedCount++;
    } else if (!newRole) {
        console.warn(`  - ⚠️ WARNING: No mapping found for role "${oldRole}" for user "${member.name}". Skipping.`);
    }
  });

  if (updatedCount === 0) {
      console.log("No roles needed updating. All roles seem to be current.");
      // We still set the flag to avoid re-running the check.
  } else {
    try {
      await batch.commit();
      console.log(`✅ Successfully migrated ${updatedCount} team member roles.`);
    } catch (error) {
      console.error("❌ Error committing the batch update:", error);
      return; // Stop if the commit fails
    }
  }
  
  // Set migration flag
  await flagRef.set({
      runAt: Timestamp.now(),
      updatedCount: updatedCount,
  });
  console.log(`Migration flag "${MIGRATION_FLAG_DOC}" set.`);
}

migrateTeamRoles().catch(console.error);
