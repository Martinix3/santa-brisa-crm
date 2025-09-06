// To run this script: npx tsx src/scripts/seed-accounts.ts
// IMPORTANT: This script is designed for seeding and will only add accounts that do not already exist by name.

import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, Timestamp } from 'firebase/firestore';
import { mockInitialAccounts } from '../lib/data';

const ACCOUNTS_COLLECTION = 'accounts';

async function seedInitialAccounts() {
  const accountsColRef = collection(db, ACCOUNTS_COLLECTION);
  
  // 1. Fetch all existing account names to avoid duplicates
  console.log("Fetching existing accounts to prevent duplicates...");
  const existingAccountsSnapshot = await getDocs(accountsColRef);
  const existingAccountNames = new Set(
    existingAccountsSnapshot.docs.map(doc => (doc.data().nombre || '').trim().toLowerCase())
  );
  console.log(`Found ${existingAccountNames.size} existing accounts.`);

  // 2. Filter the mock list to only include accounts that don't already exist
  const accountsToCreate = mockInitialAccounts.filter(accountData => {
    const normalizedName = (accountData.nombre || '').trim().toLowerCase();
    return !existingAccountNames.has(normalizedName);
  });

  if (accountsToCreate.length === 0) {
    console.log("All accounts from the list already exist in the database. No new accounts to add.");
    return;
  }

  console.log(`Starting to seed ${accountsToCreate.length} new initial accounts...`);
  
  let successCount = 0;
  for (const accountData of accountsToCreate) {
    try {
      const dataToSave = {
        ...accountData,
        legalName: null,
        cif: null,
        addressBilling: null,
        addressShipping: null,
        mainContactName: null,
        mainContactEmail: null,
        mainContactPhone: null,
        iban: null,
        notes: "Cuenta creada desde la carga inicial de datos.",
        internalNotes: null,
        salesRepId: null,
        responsableId: null,
        embajadorId: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await addDoc(accountsColRef, dataToSave);
      successCount++;
    } catch (error) {
      console.error(`Failed to add account: "${accountData.nombre}"`, error);
    }
  }

  console.log(`Seeding complete. Successfully added ${successCount} out of ${accountsToCreate.length} new accounts.`);
}

seedInitialAccounts().catch(console.error);