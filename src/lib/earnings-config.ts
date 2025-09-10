// src/lib/earnings-config.ts
'use server';

import { adminDb } from "@/lib/firebaseAdmin";
import type { EarningsConfig } from "@/types";

let CACHE: EarningsConfig | null = null;
let CACHE_TS = 0;

const defaultHorecaRules = [
  { stage: 'openAccount',  label: "Apertura de cuenta",        condition: "firstOrder",            minOrderCases: 1,   fixedFee: 150 },
  { stage: 'repeat45d',    label: "Repetición en 45 d",         condition: "secondOrderWithinDays", days: 45,           minOrderCases: 1, fixedFee: 350 },
  { stage: 'months1to3',   label: "Comisión 3 meses",           percentage: 0.06 },
  { stage: 'afterMonth4',  label: "Comisión indefinida",        percentage: 0.03 }
];

const defaultDistributorRules = [
  { tier: "medium", label: "Mediano", initialMinCases: 20,  activationFee: 250,  secondOrderMinCases: 20,  consolidationBonus: 250,  percentageFirst3M: 0.06, percentageAfter: 0.03 },
  { tier: "large",  label: "Grande",  initialMinCases: 50,  activationFee: 500,  secondOrderMinCases: 50,  consolidationBonus: 500,  percentageFirst3M: 0.05, percentageAfter: 0.025 },
  { tier: "top",    label: "Top",     initialMinCases: 100, activationFee: 1000, secondOrderMinCases: 100, consolidationBonus: 1000, percentageFirst3M: 0.04, percentageAfter: 0.02 }
];

const defaultConfig: EarningsConfig = {
  horecaRules: defaultHorecaRules,
  distributorRules: defaultDistributorRules,
};

/**
 * Carga la configuración de comisiones desde Firestore (Admin SDK), con caché en memoria.
 * Si no existe el doc, usa defaults.
 */
export async function loadEarningsConfig(force = false): Promise<EarningsConfig> {
  // refresca cada 5 minutos
  if (!force && CACHE && Date.now() - CACHE_TS < 5 * 60_000) {
    return CACHE;
  }

  const snap = await adminDb.collection("settings").doc("earnings").get();
  if (!snap.exists) {
    console.warn("[earnings-config] settings/earnings no existe. Usando defaults.");
    CACHE = defaultConfig;
  } else {
    CACHE = snap.data() as EarningsConfig;
  }

  CACHE_TS = Date.now();
  return CACHE!;
}
