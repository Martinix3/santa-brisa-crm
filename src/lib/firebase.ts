
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhk1AS8UBdfYqE3GYtR4YiQJw3BY2MWTw",
  authDomain: "santa-brisa-crm.firebaseapp.com",
  projectId: "santa-brisa-crm",
  storageBucket: "santa-brisa-crm.appspot.com",
  messagingSenderId: "200195875400",
  appId: "1:200195875400:web:1a826c47bf3933332f6e7d"
};

// Initialize Firebase using a more robust singleton pattern for Next.js
function initializeFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

const app = initializeFirebaseApp();
let auth: Auth;

// Check if we are in the browser environment before initializing auth with persistence
if (typeof window !== 'undefined') {
  try {
    auth = initializeAuth(app, {
        persistence: indexedDBLocalPersistence
    });
  } catch (e) {
    // This can happen in certain environments or with specific browser settings.
    // Fallback to a different persistence or in-memory.
    console.warn("Could not initialize IndexedDB persistence. Falling back.", e);
    auth = getAuth(app);
  }
} else {
  // For server-side rendering, just get the auth instance without persistence.
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
