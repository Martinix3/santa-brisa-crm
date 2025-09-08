// src/lib/firebaseAdmin.ts
import 'server-only';
import { initializeApp, getApps, App, type AppOptions, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

console.log('SB ENV check:', {
  SA: !!process.env.FIREBASE_SERVICE_ACCOUNT,
  SA_B64: !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
  GAC: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
  PID: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || null,
});

const ADMIN_APP_NAME = 'firebase-admin-app-instance';

let app: App;

const existingApp = getApps().find(a => a.name === ADMIN_APP_NAME);

if (existingApp) {
  app = existingApp;
} else {
  // This approach is more flexible for development environments like Cloud Workstations
  // where the user is already authenticated via gcloud CLI.
  // It will use the Application Default Credentials.
  const appOptions: AppOptions = {
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || 'santa-brisa-crm',
  };
  console.log('Initializing Firebase Admin with Application Default Credentials.');
  app = initializeApp(appOptions, ADMIN_APP_NAME);
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
