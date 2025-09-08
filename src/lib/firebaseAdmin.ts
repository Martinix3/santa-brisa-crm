
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
  // This logic attempts to use Application Default Credentials.
  // This is the most reliable method for Cloud Workstations, Cloud Run, etc.,
  // as it doesn't require hardcoding service account keys.
  // The error the user is seeing stems from the user's account lacking
  // the 'Service Account Token Creator' role on the target service account.
  console.log("Initializing Firebase Admin with Application Default Credentials.");
  const appOptions: AppOptions = {
      credential: applicationDefault(),
      projectId: process.env.GCLOUD_PROJECT || 'santa-brisa-crm',
  };
  
  app = initializeApp(appOptions, ADMIN_APP_NAME);
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
