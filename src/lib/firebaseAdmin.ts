
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = 'santa-brisa-crm.appspot.com';

let app: App;

if (getApps().length === 0) {
  try {
    // The simplest initialization, relying 100% on Application Default Credentials.
    // This is the most robust method for Google Cloud environments like App Hosting.
    app = initializeApp();
    console.info("Firebase Admin SDK initialized using environment's default credentials.");
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", {
        errorMessage: error.message,
        docs: "https://firebase.google.com/docs/admin/setup",
    });
    // Provide a hint for local development if ADC are missing.
    if (error.message.includes('Google Application Default Credentials are not available')) {
      console.error("Hint: This usually means you're running locally. Run `gcloud auth application-default login` in your terminal and try again.");
    }
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
} else {
    app = getApps()[0];
}

export const adminDb = getFirestore(app);
export const adminBucket = getStorage(app).bucket(BUCKET_NAME);
