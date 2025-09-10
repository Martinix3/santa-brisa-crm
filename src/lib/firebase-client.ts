// src/lib/firebase-client.ts
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// --- Comprobación de env (la llamas desde el AuthProvider) ---
export function assertFirebaseEnv(): void {
  const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "").trim();
  const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "").trim();
  const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "").trim();
  const appId = (process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "").trim();

  const missing: string[] = [];
  if (!apiKey) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!authDomain) missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!appId) missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");

  if (missing.length) {
    console.error("Faltan variables de entorno de Firebase:", missing);
    throw new Error(`Faltan variables de entorno de Firebase: ${missing.join(", ")}`);
  }

  if (!/^AIza[0-9A-Za-z_\-]{35}$/.test(apiKey)) {
    console.warn("[SB/firebase] La API key no parece válida por patrón. Tail:", apiKey.slice(-6));
  }
  console.info("[SB/firebase] env OK. apiKeyTail:", apiKey.slice(-6));
}

// --- Config ---
const firebaseConfig = {
  apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "").trim(),
  authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "").trim(),
  projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "").trim(),
  appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "").trim(),
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- Emuladores (solo si lo pides por env) ---
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "1";
console.info("[SB/firebase] useEmulators:", useEmulators);

if (useEmulators) {
  const host = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
  console.info("[SB/firebase] Conectando a emuladores en", host);
  if (typeof window !== "undefined") {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectStorageEmulator(storage, host, 9199);
  }
  console.info("[SB/firebase] Conectado a emuladores.");
} else {
  console.info("[SB/firebase] Conectado a producción (Firebase real).");
}

// --- Persistencia Auth ---
export async function ensureAuthPersistence(): Promise<void> {
  await setPersistence(auth, browserLocalPersistence);
}
