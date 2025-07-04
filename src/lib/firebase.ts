
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhk1AS8UBdfYqE3GYtR4YiQJw3BY2MWTw",
  authDomain: "santa-brisa-crm.firebaseapp.com",
  projectId: "santa-brisa-crm",
  storageBucket: "santa-brisa-crm.firebasestorage.app", // Corrected bucket name
  messagingSenderId: "200195875400",
  appId: "1:200195875400:web:1a826c47bf3933332f6e7d"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(app); // Initialize Firestore and export it
export const storage = getStorage(app); // Initialize Firebase Storage and export it
export default app;
