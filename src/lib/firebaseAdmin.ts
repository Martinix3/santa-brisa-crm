import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// In a managed environment like Cloud Workstations or Cloud Run,
// applicationDefault() automatically discovers credentials and configuration.
// We no longer need to read them from .env.

if (getApps().length === 0) {
  try {
    initializeApp({
      credential: applicationDefault(),
      // The storageBucket and projectId will be inferred from the environment's
      // Application Default Credentials (ADC).
    });
    console.log("Firebase Admin SDK initialized successfully using environment's Application Default Credentials.");
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    // This provides a helpful hint if running in a misconfigured local environment.
    if (error.message.includes('Google Application Default Credentials are not available')) {
      console.error("Hint: This usually means you're running locally. Run `gcloud auth application-default login` in your terminal and try again.");
    }
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

// Calling bucket() without arguments will use the default bucket from the initialized app.
export const adminBucket = getStorage().bucket();
