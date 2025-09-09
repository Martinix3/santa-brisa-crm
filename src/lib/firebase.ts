// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, type Auth } from "firebase/auth";
import { getFirestore, Timestamp } from "firebase/firestore"; // Import Firestore
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Initialize Firebase using a more robust singleton pattern for Next.js
function initializeFirebaseApp(): FirebaseApp {
  const apps = getApps();
  if (apps.length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

const app = initializeFirebaseApp();
// Use getAuth directly. Firebase SDK is smart enough to handle initialization.
const auth = getAuth(app);

// For client-side persistence, this setup is more robust.
if (typeof window !== 'undefined') {
  try {
    // This will attempt to set persistence. It's fine if it's called multiple times
    // as Firebase handles the initialization logic internally.
    initializeAuth(app, {
      persistence: [browserLocalPersistence, indexedDBLocalPersistence]
    });
  } catch (e) {
    console.warn("Could not initialize auth persistence:", e);
  }
}

export { auth, Timestamp };
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
