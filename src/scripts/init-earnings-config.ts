// To run this script: npx ts-node scripts/init-earnings-config.ts
// IMPORTANT: This is a one-time script to seed the initial earnings config.
// Make sure your Firebase Admin SDK credentials are set up.

import { db } from '../lib/firebaseAdmin'; // Use admin SDK for scripts
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { HorecaRule, DistributorRule } from '../types';

const SETTINGS_COLLECTION = 'settings';
const EARNINGS_DOC_ID = 'earnings';

const horecaRules: HorecaRule[] = [
    {
      stage: "openAccount",
      label: "Apertura de cuenta",
      condition: "firstOrder",
      minOrderCases: 1,
      fixedFee: 150
    },
    {
      stage: "repeat45d",
      label: "Repetición en 45 d",
      condition: "secondOrderWithinDays",
      days: 45,
      minOrderCases: 1,
      fixedFee: 350
    },
    {
      stage: "months1to3",
      label: "Comisión 3 meses",
      percentage: 0.06
    },
    {
      stage: "afterMonth4",
      label: "Comisión indefinida",
      percentage: 0.03
    }
];

const distributorRules: DistributorRule[] = [
    {
      tier: "medium",
      label: "Mediano",
      initialMinCases: 20,
      activationFee: 250,
      secondOrderMinCases: 20,
      consolidationBonus: 250,
      percentageFirst3M: 0.06,
      percentageAfter: 0.03
    },
    {
      tier: "large",
      label: "Grande",
      initialMinCases: 50,
      activationFee: 500,
      secondOrderMinCases: 50,
      consolidationBonus: 500,
      percentageFirst3M: 0.05,
      percentageAfter: 0.025
    },
    {
      tier: "top",
      label: "Top",
      initialMinCases: 100,
      activationFee: 1000,
      secondOrderMinCases: 100,
      consolidationBonus: 1000,
      percentageFirst3M: 0.04,
      percentageAfter: 0.02
    }
];


async function initializeEarningsConfig() {
    console.log("Initializing earnings configuration in Firestore...");
    const docRef = doc(db, SETTINGS_COLLECTION, EARNINGS_DOC_ID);
    
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        console.log("Configuration document already exists. No action taken.");
        return;
    }

    const initialConfig = {
        horecaRules,
        distributorRules,
        lastEdited: Timestamp.now(),
        editedBy: "system_init_script"
    };

    try {
        await setDoc(docRef, initialConfig);
        console.log("Successfully created the initial earnings configuration document.");
    } catch (error) {
        console.error("Error creating earnings configuration:", error);
    }
}

initializeEarningsConfig();
