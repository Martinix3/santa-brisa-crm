
import { initializeApp, getApps, App, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = 'santa-brisa-crm.appspot.com';

let app: App;

// This logic ensures that the app is initialized only once.
if (getApps().length === 0) {
  try {
    app = initializeApp();
    console.info("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", {
        errorMessage: error.message,
    });
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
} else {
    app = getApps()[0];
}

export const adminDb = getFirestore(app);
export const adminBucket = getStorage(app).bucket(BUCKET_NAME);
