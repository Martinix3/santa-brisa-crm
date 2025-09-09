// src/lib/firebase-client.ts
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator, type Auth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
};

export function assertFirebaseEnv() {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ] as const;

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Faltan variables de entorno de Firebase:', missing);
  }
}

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Persistencia de sesión (arregla “no conserva autenticación” en navegador)
let persistencePromise: Promise<void> | null = null;
export function ensureAuthPersistence() {
  if (typeof window !== 'undefined' && !persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence)
      .catch((error) => {
        console.warn("Firebase persistence error:", error.code, error.message);
      });
  }
  return persistencePromise;
}

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
  console.log("Connecting to Firebase Emulators...");
  try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log("Successfully connected to Emulators.");
  } catch (e) {
      console.error("Error connecting to emulators. Make sure they are running.", e);
  }
}

export { app, auth, db, storage, GoogleAuthProvider, signInWithPopup };
