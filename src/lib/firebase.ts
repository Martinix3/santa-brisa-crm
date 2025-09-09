// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Singleton pattern to initialize Firebase app only once
function initializeFirebaseApp(): FirebaseApp {
  const apps = getApps();
  if (apps.length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

const app = initializeFirebaseApp();
const db = getFirestore(app);
const storage = getStorage(app);

// This function can be safely called from client components to get the auth instance.
// It will not be executed on the server.
const getFirebaseAuth = (): Auth => {
    return getAuth(app);
}

export { app, db, storage, Timestamp, getFirebaseAuth };
