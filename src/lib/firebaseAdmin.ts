
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getStorage, Bucket } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-santabrisa';
const BUCKET_NAME = 'santa-brisa-crm.firebasestorage.app';

/**
 * A memoized function to get the Firebase Admin App instance.
 * It initializes the app only if it hasn't been initialized yet,
 * explicitly setting the storage bucket.
 * @returns The initialized Firebase Admin App instance.
 */
function getFirebaseAdminApp(): App {
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existingApp) {
    return existingApp;
  }
  
  // Initialize with the correct storageBucket. Service account credentials
  // will be auto-detected in a managed Google Cloud environment.
  console.log(`Initializing Firebase Admin App "${ADMIN_APP_NAME}" with bucket: ${BUCKET_NAME}`);
  return initializeApp({
    storageBucket: BUCKET_NAME,
  }, ADMIN_APP_NAME);
}

/**
 * Gets the admin storage bucket instance.
 * This function is robust and ensures the correct bucket is used.
 * @returns The Firebase Admin Storage Bucket instance.
 */
export function getAdminBucket(): Bucket {
    const app = getFirebaseAdminApp();
    // The bucket() call without arguments will use the one defined in initializeApp.
    const bucket = getStorage(app).bucket();
    console.log(`Bucket active: ${bucket.name}`); // For debugging
    return bucket;
}
