import { initializeApp, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = 'santa-brisa-crm.appspot.com';

if (getApps().length === 0) {
  try {
    // On Google Cloud environments like App Hosting, calling initializeApp() with no
    // arguments automatically uses the environment's service account credentials.
    // This is the most robust method for production.
    initializeApp({
      storageBucket: BUCKET_NAME,
    });
    console.info({
        event: 'firebase_admin_init_success',
        message: "Firebase Admin SDK initialized using environment's default credentials.",
        bucket: BUCKET_NAME,
    });
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", {
        errorMessage: error.message,
        docs: "https://firebase.google.com/docs/admin/setup",
    });
    // This hint is helpful for local development outside a configured GCP environment.
    if (error.message.includes('Google Application Default Credentials are not available')) {
      console.error("Hint: This usually means you're running locally. Run `gcloud auth application-default login` in your terminal and try again.");
    }
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

// Explicitly get the bucket by name for maximum safety.
export const adminBucket = getStorage().bucket(BUCKET_NAME);
