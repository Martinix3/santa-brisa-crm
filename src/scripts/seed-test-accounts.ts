// To run this script: npx tsx src/scripts/seed-test-accounts.ts
// This script creates a set of test accounts, each representing a specific commercial status.
// It's designed to be idempotent; it won't create duplicate accounts if they already exist.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, WriteBatch, CollectionReference } from 'firebase-admin/firestore';
import { subDays } from 'date-fns';
import { fromFirestore } from '@/services/account-mapper';
import type { Account, Order } from '@/types';
import { toSearchName } from '@/lib/schemas/account-schema';

// --- Admin SDK Initialization ---
let db: FirebaseFirestore.Firestore;
try {
  initializeApp({ credential: applicationDefault(), projectId: process.env.GCLOUD_PROJECT || 'santa-brisa-crm' });
  db = getFirestore();
} catch (e: any) {
  if (e.code === 'app/duplicate-app') {
    db = getFirestore();
  } else {
    throw e;
  }
}

const ACCOUNTS_COLLECTION = 'accounts';
const ORDERS_COLLECTION = 'orders';

const TEST_REP = { id: 'TEST_USER_ID', name: 'Comercial de Pruebas' };

const accountsToSeed = [
    { name: 'Test Potencial (Sin Interacciones)', statusTarget: 'Pendiente', interactions: [] },
    { 
        name: 'Test Activa (1 Pedido)', 
        statusTarget: 'Activo',
        interactions: [
            { status: 'Entregado', value: 100, createdAt: subDays(new Date(), 15) }
        ]
    },
    { 
        name: 'Test Repetición (2 Pedidos)', 
        statusTarget: 'Repetición',
        interactions: [
            { status: 'Entregado', value: 150, createdAt: subDays(new Date(), 20) },
            { status: 'Facturado', value: 120, createdAt: subDays(new Date(), 50) }
        ]
    },
    { 
        name: 'Test Inactiva (>90 días)', 
        statusTarget: 'Inactivo',
        interactions: [
            { status: 'Pagado', value: 200, createdAt: subDays(new Date(), 100) }
        ]
    },
    { 
        name: 'Test Seguimiento (Interacción sin Venta)', 
        statusTarget: 'Seguimiento',
        interactions: [
            { status: 'Completado', value: 0, createdAt: subDays(new Date(), 10) }
        ]
    },
     { 
        name: 'Test Fallida (Última Interacción Fallida)', 
        statusTarget: 'Fallido',
        interactions: [
            { status: 'Fallido', value: 0, createdAt: subDays(new Date(), 5) },
            { status: 'Completado', value: 0, createdAt: subDays(new Date(), 30) },
        ]
    },
    { 
        name: 'Test Programada (Visita Futura)', 
        statusTarget: 'Programada',
        interactions: [
            { status: 'Programada', value: 0, visitDate: subDays(new Date(), -5) } // 5 days in the future
        ]
    }
];

async function seedTestAccounts() {
    console.log("Starting test accounts seeder...");
    
    const accountsRef = db.collection(ACCOUNTS_COLLECTION);
    const ordersRef = db.collection(ORDERS_COLLECTION);

    for (const seed of accountsToSeed) {
        // Check if account already exists
        const accountQuery = await accountsRef.where('name', '==', seed.name).limit(1).get();
        
        let accountId: string;
        let account: Account;

        if (accountQuery.empty) {
            console.log(`  - Creating account: "${seed.name}"`);
            const newAccountData = {
                name: seed.name,
                searchName: toSearchName(seed.name),
                type: 'customer',
                status: 'lead',
                potencial: 'medio',
                leadScore: 50,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                owner_user_id: TEST_REP.id,
                salesRepId: TEST_REP.id,
                responsableId: TEST_REP.id,
                responsableName: TEST_REP.name
            };
            const docRef = await accountsRef.add(newAccountData);
            accountId = docRef.id;
            const newDocSnap = await docRef.get();
            account = fromFirestore({ id: newDocSnap.id, ...newDocSnap.data() });

        } else {
            console.log(`  - Account "${seed.name}" already exists. Skipping creation, checking interactions.`);
            accountId = accountQuery.docs[0].id;
            account = fromFirestore(accountQuery.docs[0]);
        }

        // Check and create interactions if they don't exist
        for (const interaction of seed.interactions) {
             const interactionQuery = await ordersRef
                .where('accountId', '==', accountId)
                .where('status', '==', interaction.status)
                .limit(1).get();

             if (interactionQuery.empty) {
                console.log(`    - Creating interaction with status "${interaction.status}" for "${seed.name}"`);
                const newInteractionData: Partial<Order> = {
                    accountId: accountId,
                    clientName: account.name,
                    status: interaction.status as any,
                    value: interaction.value,
                    createdAt: interaction.createdAt ? interaction.createdAt.toISOString() : new Date().toISOString(),
                    visitDate: interaction.visitDate ? interaction.visitDate.toISOString() : undefined,
                    nextActionDate: interaction.visitDate ? interaction.visitDate.toISOString() : undefined,
                    salesRep: TEST_REP.name,
                    taskCategory: 'Commercial',
                    orderIndex: 0,
                    lastUpdated: new Date().toISOString(),
                };
                await ordersRef.add(newInteractionData);
             } else {
                 console.log(`    - Interaction with status "${interaction.status}" already exists for "${seed.name}". Skipping.`);
             }
        }
    }
    
    console.log("✅ Seeding script completed.");
}

seedTestAccounts().catch(console.error);