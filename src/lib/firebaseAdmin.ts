import 'server-only';
import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

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
