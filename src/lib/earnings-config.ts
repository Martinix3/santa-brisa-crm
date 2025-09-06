

'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import type { EarningsConfig } from "@/types";

let CACHE: EarningsConfig | null = null;
let CACHE_TS = 0;

const defaultHorecaRules = [
    { stage: 'openAccount', label: "Apertura de cuenta", condition: "firstOrder", minOrderCases: 1, fixedFee: 150 },
    { stage: 'repeat45d', label: "Repetición en 45 d", condition: "secondOrderWithinDays", days: 45, minOrderCases: 1, fixedFee: 350 },
    { stage: 'months1to3', label: "Comisión 3 meses", percentage: 0.06 },
    { stage: 'afterMonth4', label: "Comisión indefinida", percentage: 0.03 }
];

const defaultDistributorRules = [
    { tier: "medium", label: "Mediano", initialMinCases: 20, activationFee: 250, secondOrderMinCases: 20, consolidationBonus: 250, percentageFirst3M: 0.06, percentageAfter: 0.03 },
    { tier: "large", label: "Grande", initialMinCases: 50, activationFee: 500, secondOrderMinCases: 50, consolidationBonus: 500, percentageFirst3M: 0.05, percentageAfter: 0.025 },
    { tier: "top", label: "Top", initialMinCases: 100, activationFee: 1000, secondOrderMinCases: 100, consolidationBonus: 1000, percentageFirst3M: 0.04, percentageAfter: 0.02 }
];

const defaultConfig: EarningsConfig = {
    horecaRules: defaultHorecaRules,
    distributorRules: defaultDistributorRules,
};

/**
 * Loads the earnings configuration from Firestore, with an in-memory cache.
 * Falls back to hardcoded defaults if the Firestore document doesn't exist.
 * @param force - If true, bypasses the cache and fetches from Firestore.
 * @returns The earnings configuration.
 */
export async function loadEarningsConfig(force = false): Promise<EarningsConfig> {
  // Refreshes every 5 minutes
  if (!force && CACHE && Date.now() - CACHE_TS < 5 * 60_000) {
    return CACHE;
  }

  const snap = await getDoc(doc(db, "settings", "earnings"));
  if (!snap.exists()) {
    console.warn("Earnings config document not found in Firestore. Using hardcoded defaults.");
    // In a real scenario, you might want to create the doc here.
    // For now, we return the defaults without writing to DB.
    CACHE = defaultConfig;
  } else {
    CACHE = snap.data() as EarningsConfig;
  }
  
  CACHE_TS = Date.now();
  return CACHE!;
}
