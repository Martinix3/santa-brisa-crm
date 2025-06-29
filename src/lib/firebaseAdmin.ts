
'use server';

import { initializeApp, getApps, App, applicationDefault, getApp } from 'firebase-admin/app';
import { getStorage, Bucket } from 'firebase-admin/storage';

// CORRECT BUCKET NAME based on user's screenshot
const BUCKET_NAME = 'santa-brisa-crm.firebasestorage.app';

/**
 * A memoized function to get the Firebase Admin App instance.
 * It initializes the app only if it hasn't been initialized yet.
 * @returns The initialized Firebase Admin App instance.
 */
function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }
  
  // Explicitly initialize with the bucket name to avoid discovery issues.
  return initializeApp({
    credential: applicationDefault(),
    storageBucket: BUCKET_NAME,
  });
}

/**
 * Gets the admin storage bucket instance.
 * @returns A promise that resolves to the Firebase Admin Storage Bucket instance.
 */
export const getAdminBucket = async (): Promise<Bucket> => {
    const app = getFirebaseAdminApp();
    // Because we configured the bucket during initialization, we can now ask for
    // the default bucket from the storage instance. This is the most reliable method.
    return getStorage(app).bucket();
}
