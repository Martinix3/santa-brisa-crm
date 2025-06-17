
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// !! IMPORTANT: COMPLETE THE MISSING VALUES BELOW !!
// You MUST obtain apiKey, messagingSenderId, and appId from your project's
// settings in the Firebase Console (console.firebase.google.com)
// for the project with ID "studio-9100296063".
// Look for your Web App (</>) configuration within that project.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE_FROM_FIREBASE_CONSOLE", // <-- !!! YOU MUST REPLACE THIS !!!
  authDomain: "studio-9100296063.firebaseapp.com",
  projectId: "studio-9100296063",
  storageBucket: "studio-9100296063.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE_FROM_FIREBASE_CONSOLE", // <-- !!! YOU MUST REPLACE THIS !!!
  appId: "YOUR_APP_ID_HERE_FROM_FIREBASE_CONSOLE" // <-- !!! YOU MUST REPLACE THIS !!!
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export default app;
