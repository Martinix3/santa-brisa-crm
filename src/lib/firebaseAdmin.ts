import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Ensure you have these environment variables set in your .env file
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!serviceAccount) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. Please add it to your .env file.');
}
if (!storageBucket) {
    throw new Error('The FIREBASE_STORAGE_BUCKET environment variable is not set. Please add it to your .env file.');
}

if (getApps().length === 0) {
  try {
    initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      storageBucket: storageBucket,
    });
    console.log("Firebase Admin SDK initialized.");
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    // Provide a more specific error for parsing issues
    if (error.message.includes('JSON.parse')) {
      throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it is a valid JSON string.');
    }
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

export const adminBucket = getStorage().bucket();
