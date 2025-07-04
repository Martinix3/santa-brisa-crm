'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getStorage, Bucket } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-santabrisa'; // Unique name for the app

/**
 * A memoized function to get the Firebase Admin App instance.
 * It initializes the app only if it hasn't been initialized yet.
 * This version uses a named app to prevent HMR-related issues in Next.js.
 * In a managed Google Cloud environment, initializeApp() with no arguments
 * will automatically use the correct service account and settings.
 * @returns The initialized Firebase Admin App instance.
 */
function getFirebaseAdminApp(): App {
  // Check if the app is already initialized
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existingApp) {
    return existingApp;
  }

  // Initialize the app without any config. The SDK will detect the environment.
  return initializeApp(undefined, ADMIN_APP_NAME);
}

/**
 * Gets the admin storage bucket instance from the default app configuration.
 * @returns A promise that resolves to the Firebase Admin Storage Bucket instance.
 */
export const getAdminBucket = async (): Promise<Bucket> => {
    const app = getFirebaseAdminApp();
    // When bucket() is called without a name, it returns the default bucket
    return getStorage(app).bucket();
}
