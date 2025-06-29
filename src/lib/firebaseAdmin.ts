
import { initializeApp, getApps, App, applicationDefault, getApp } from 'firebase-admin/app';
import { getStorage, Bucket } from 'firebase-admin/storage';

const BUCKET_NAME = 'santa-brisa-crm.appspot.com';

/**
 * A memoized function to get the Firebase Admin App instance.
 * It initializes the app only if it hasn't been initialized yet.
 * This is crucial for serverless environments to avoid re-initialization errors.
 * @returns The initialized Firebase Admin App instance.
 */
function getFirebaseAdminApp(): App {
  // Check if the default app is already initialized
  if (getApps().length > 0) {
    return getApp();
  }
  
  // If not, initialize it with Application Default Credentials
  // and the specific storage bucket.
  return initializeApp({
    credential: applicationDefault(),
    storageBucket: BUCKET_NAME,
  });
}

/**
 * Gets the admin storage bucket instance.
 * This function ensures the admin app is initialized before getting the bucket.
 * @returns The Firebase Admin Storage Bucket instance.
 */
export const getAdminBucket = (): Bucket => {
    const app = getFirebaseAdminApp();
    // Explicitly get the bucket by name from the storage instance
    // for maximum reliability in all environments.
    return getStorage(app).bucket(BUCKET_NAME);
}
