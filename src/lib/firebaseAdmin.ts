
'use server';

import { initializeApp, getApps, App, applicationDefault, getApp } from 'firebase-admin/app';
import { getStorage, Bucket } from 'firebase-admin/storage';

const BUCKET_NAME = 'santa-brisa-crm.appspot.com';

/**
 * A memoized function to get the Firebase Admin App instance.
 * It initializes the app only if it hasn't been initialized yet.
 * @returns The initialized Firebase Admin App instance.
 */
function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }
  
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
    return getStorage(app).bucket();
}
