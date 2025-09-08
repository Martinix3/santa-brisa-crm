
// src/lib/firebaseAdmin.ts
import 'server-only';
import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-instance';

let app: App;

if (getApps().find(a => a.name === ADMIN_APP_NAME)) {
  app = getApps().find(a => a.name === ADMIN_APP_NAME)!;
} else {
  // Use Application Default Credentials. This is the most robust way for Cloud Workstations.
  // The developer should be authenticated via `gcloud auth application-default login`.
  app = initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || 'santa-brisa-crm',
  }, ADMIN_APP_NAME);
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
