// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-instance';

let app: App;

if (getApps().find(a => a.name === ADMIN_APP_NAME)) {
  app = getApps().find(a => a.name === ADMIN_APP_NAME)!;
} else {
  // Use application default credentials in production/cloud environments
  // In local dev, this relies on `gcloud auth application-default login`
  const credential = applicationDefault();
  app = initializeApp({ credential }, ADMIN_APP_NAME);
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
