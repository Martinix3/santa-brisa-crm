
'use server';

import { initializeApp, getApps, App, applicationDefault, getApp } from 'firebase-admin/app';
import { getStorage, Bucket } from 'firebase-admin/storage';

const BUCKET_NAME = 'santa-brisa-crm.appspot.com';
const ADMIN_APP_NAME = 'firebase-admin-app-santabrisa'; // Unique name for the app

/**
 * A memoized function to get the Firebase Admin App instance.
 * It initializes the app only if it hasn't been initialized yet.
 * This version uses a named app to prevent HMR-related issues in Next.js.
 * @returns The initialized Firebase Admin App instance.
 */
function getFirebaseAdminApp(): App {
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existingApp) {
    return existingApp;
  }
  
  return initializeApp({
    credential: applicationDefault(),
    storageBucket: BUCKET_NAME,
  }, ADMIN_APP_NAME);
}

/**
 * Gets the admin storage bucket instance.
 * @returns A promise that resolves to the Firebase Admin Storage Bucket instance.
 */
export const getAdminBucket = async (): Promise<Bucket> => {
    const app = getFirebaseAdminApp();
    return getStorage(app).bucket();
}
