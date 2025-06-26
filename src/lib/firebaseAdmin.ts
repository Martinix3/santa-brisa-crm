import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Explicitly define the bucket name to prevent ambiguity.
// This name must match the one in your Firebase project settings.
const BUCKET_NAME = 'santa-brisa-crm-bucket';

if (getApps().length === 0) {
  try {
    // In a managed environment, applicationDefault() automatically discovers credentials.
    initializeApp({
      credential: applicationDefault(),
      // Also setting the storageBucket in the config for completeness.
      storageBucket: BUCKET_NAME,
    });
    console.info({
        event: 'firebase_admin_init_success',
        bucket: BUCKET_NAME,
        message: "Firebase Admin SDK initialized successfully.",
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
