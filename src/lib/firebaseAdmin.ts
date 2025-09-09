
import 'server-only';
import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

/**
 * @fileoverview Initializes the Firebase Admin SDK.
 * 
 * --- HOW AUTHENTICATION WORKS IN THIS ENVIRONMENT ---
 * 
 * This application uses Application Default Credentials (ADC), the modern and secure
 * method for authenticating to Google Cloud services. This means you DO NOT
 * need to download or manage JSON service account keys.
 * 
 * The environment (like Firebase Studio, Cloud Run, Cloud Functions) has a
 * service account attached to it. The `applicationDefault()` method
 * automatically and securely uses the identity of this attached service account.
 * 
 * If you encounter permission errors, it's almost never a problem with the code
 * or a missing key. Instead, you need to grant the correct IAM roles to the
 * service account being used by your Cloud Workstation/Firebase Studio environment.
 * 
 * Common roles needed:
 * - `Firebase Admin SDK Administrator Service Agent`
 * - `Cloud Datastore User` (for Firestore access)
 * - `Document AI API User` (for Document AI)
 * - `Secret Manager Secret Accessor` (for accessing secrets)
 * 
 * For local development outside of a managed environment, you can use:
 * `gcloud auth application-default login`
 * This command uses your personal credentials temporarily and securely.
 */

const ADMIN_APP_NAME = 'firebase-admin-app-instance';

let app: App;

// Check if the app is already initialized to prevent duplicates
if (getApps().some((app) => app.name === ADMIN_APP_NAME)) {
  app = getApps().find((app) => app.name === ADMIN_APP_NAME)!;
} else {
  // Use ADC. This is the most secure and recommended method.
  // It automatically finds credentials in managed environments or from gcloud.
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
