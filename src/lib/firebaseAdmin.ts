
// src/lib/firebaseAdmin.ts
import 'server-only';
import { initializeApp, getApps, App, cert, applicationDefault, type AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-instance';

let app: App;

if (getApps().find(a => a.name === ADMIN_APP_NAME)) {
  app = getApps().find(a => a.name === ADMIN_APP_NAME)!;
} else {
  // This logic attempts to use a service account first, which is more robust for servers.
  // It falls back to Application Default Credentials for local development or environments
  // where the service account JSON isn't provided as an env var.
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT || (
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 
      ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
      : undefined
  );

  let appOptions: AppOptions;

  if (serviceAccountKey) {
    // Recommended for production/server environments
    console.log("Initializing Firebase Admin with explicit Service Account credentials.");
    appOptions = {
        credential: cert(JSON.parse(serviceAccountKey)),
        projectId: process.env.FIREBASE_PROJECT_ID || 'santa-brisa-crm',
    };
  } else {
    // Fallback for local development, Cloud Workstations, etc.
    console.log("Service account credentials not found. Initializing Firebase Admin with Application Default Credentials.");
    appOptions = {
        credential: applicationDefault(),
        projectId: process.env.GCLOUD_PROJECT || 'santa-brisa-crm',
    };
  }
  
  app = initializeApp(appOptions, ADMIN_APP_NAME);
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
