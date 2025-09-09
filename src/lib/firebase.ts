// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
  console.log("🔌 Conectando a Firebase Emulators...");
  
  // Conectar a Firestore Emulator
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  
  // Conectar a Storage Emulator
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  
  // Conectar a Auth Emulator solo si se especifica, para permitir logins reales con Google
  if (process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    console.log("    -> Auth Emulator conectado.");
  }

  console.log("✅ Conexión con Emuladores lista.");
}
