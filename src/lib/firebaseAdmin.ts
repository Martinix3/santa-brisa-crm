
import 'server-only';
import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

/**
 * @fileoverview Initializes the Firebase Admin SDK.
 * 
 * This setup uses Application Default Credentials (ADC), the recommended method for both
 * local development and managed cloud environments.
 * 
 * --- How to Authenticate ---
 * 
 * There are two primary ways to provide credentials to this application:
 * 
 * 1. (RECOMMENDED LOCALLY) Using the gcloud CLI:
 *    Run the following command in your terminal ONCE:
 *    `gcloud auth application-default login`
 *    This will open a browser window to authenticate with your personal Google account.
 *    The credentials are saved locally and automatically picked up by this configuration.
 * 
 * 2. (RECOMMENDED FOR PRODUCTION/CI) Using a Service Account JSON file:
 *    a. Download the JSON key file for a service account from your Google Cloud project.
 *    b. Save it securely in your project (e.g., in the root, and ensure it's in .gitignore).
 *    c. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of this file.
 *       Example (.env.local):
 *       `GOOGLE_APPLICATION_CREDENTIALS=./path/to/your/service-account-key.json`
 * 
 * The `applicationDefault()` method will automatically detect and use the credentials
 * provided by either of these methods.
 */

const ADMIN_APP_NAME = 'firebase-admin-app-instance';

let app: App;

// Check if the app is already initialized to prevent duplicates
if (getApps().some((app) => app.name === ADMIN_APP_NAME)) {
  app = getApps().find((app) => app.name === ADMIN_APP_NAME)!;
} else {
  // Use ADC as the primary, robust method for managed environments
  // Fallback to service account from env vars is not included as ADC is preferred
  app = initializeApp(
    {
      credential: applicationDefault(),
      projectId: process.env.GCLOUD_PROJECT || 'santa-brisa-crm',
    },
    ADMIN_APP_NAME
  );
  console.log('Firebase Admin initialized with Application Default Credentials (ADC).');
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
