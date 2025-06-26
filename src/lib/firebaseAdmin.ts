import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (getApps().length === 0) {
  if (!storageBucket) {
    throw new Error('The FIREBASE_STORAGE_BUCKET environment variable is not set. Please add it to your .env file.');
  }
  if (!projectId) {
    throw new Error('The NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set. Please add it to your .env file.');
  }

  try {
    initializeApp({
      credential: applicationDefault(),
      storageBucket: storageBucket,
      projectId: projectId,
    });
    console.log("Firebase Admin SDK initialized successfully with Application Default Credentials.");
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    // Provide more specific feedback if possible
    if (error.message.includes('Google Application Default Credentials are not available')) {
      console.error("Hint: This usually means you're running locally. Run `gcloud auth application-default login` in your terminal and try again.");
    }
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

export const adminBucket = getStorage().bucket();
