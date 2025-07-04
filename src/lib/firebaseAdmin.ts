

'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getStorage, Bucket } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-santabrisa';
const BUCKET_NAME = 'santa-brisa-crm.firebasestorage.app';

/**
 * A memoized function to get the Firebase Admin App instance.
 * It initializes the app only if it hasn't been initialized yet.
 * @returns The initialized Firebase Admin App instance.
 */
function getFirebaseAdminApp(): App {
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existingApp) {
    return existingApp;
  }
  
  // In a managed Google Cloud environment, initialize with an empty config
  // to allow the SDK to auto-detect credentials and project settings.
  return initializeApp({}, ADMIN_APP_NAME);
}

/**
 * Gets the admin storage bucket instance.
 * This function is robust and ensures the correct bucket is used.
 * @returns The Firebase Admin Storage Bucket instance.
 */
export function getAdminBucket(): Bucket {
    const app = getFirebaseAdminApp();
    // Explicitly get the bucket by its correct name.
    const bucket = getStorage(app).bucket(BUCKET_NAME);
    console.log(`Bucket active: ${bucket.name}`); // For debugging
    return bucket;
}
