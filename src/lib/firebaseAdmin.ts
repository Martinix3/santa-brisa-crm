
'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getStorage, Bucket } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-santabrisa';
const BUCKET_NAME = 'santa-brisa-crm.firebasestorage.app';

/**
 * A memoized function to get the Firebase Admin App instance.
 * It initializes the app only if it hasn't been initialized yet.
 * We explicitly provide the storageBucket to ensure the Admin SDK
 * uses the correct bucket, especially in environments where auto-detection
 * might be ambiguous.
 * @returns The initialized Firebase Admin App instance.
 */
function getFirebaseAdminApp(): App {
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existingApp) {
    return existingApp;
  }

  // Initialize with the correct storageBucket. Service account credentials
  // will be auto-detected in a managed Google Cloud environment.
  return initializeApp({
    storageBucket: BUCKET_NAME,
  }, ADMIN_APP_NAME);
}

/**
 * Gets the admin storage bucket instance from the app configured with the correct bucket name.
 * @returns A promise that resolves to the Firebase Admin Storage Bucket instance.
 */
export const getAdminBucket = async (): Promise<Bucket> => {
    const app = getFirebaseAdminApp();
    // Explicitly get the bucket by name to ensure correctness.
    return getStorage(app).bucket(BUCKET_NAME);
}
