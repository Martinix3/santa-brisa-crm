
'use server';

import { initializeApp, getApps, App, applicationDefault, getApp } from 'firebase-admin/app';
import { getStorage, Bucket } from 'firebase-admin/storage';

const BUCKET_NAME = 'santa-brisa-crm.appspot.com';
const PROJECT_ID = 'santa-brisa-crm';

/**
 * A memoized function to get the Firebase Admin App instance.
 * It initializes the app only if it hasn't been initialized yet.
 * This pattern relies on Google Cloud's Application Default Credentials (ADC)
 * to automatically handle authentication in a managed environment like App Hosting.
 * @returns The initialized Firebase Admin App instance.
 */
function getFirebaseAdminApp(): App {
  // Check if the default app is already initialized
  if (getApps().length > 0) {
    return getApp();
  }
  
  // Initialize with default credentials AND explicitly set the projectID and storage bucket.
  // This provides the Admin SDK with all necessary context, preventing token refresh errors
  // that can occur in some server environments when auto-detection is not sufficient.
  return initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
    storageBucket: BUCKET_NAME,
  });
}

/**
 * Gets the admin storage bucket instance.
 * This function ensures the admin app is initialized and then explicitly
 * requests the desired bucket by name.
 * This function must be async as required by Next.js for Server Actions.
 * @returns A promise that resolves to the Firebase Admin Storage Bucket instance.
 */
export const getAdminBucket = async (): Promise<Bucket> => {
    const app = getFirebaseAdminApp();
    // Explicitly get the bucket by name from the storage instance
    // for maximum reliability in all environments.
    return getStorage(app).bucket(BUCKET_NAME);
}
