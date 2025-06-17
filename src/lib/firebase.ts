
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhk1AS8UBdfYqE3GYtR4YiQJw3BY2MWTw",
  authDomain: "santa-brisa-crm.firebaseapp.com",
  projectId: "santa-brisa-crm",
  storageBucket: "santa-brisa-crm.firebasestorage.app",
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
export default app;
