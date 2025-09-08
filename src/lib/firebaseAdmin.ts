// src/lib/firebaseAdmin.ts
import 'server-only';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-instance';

let app: App;

if (getApps().find(a => a.name === ADMIN_APP_NAME)) {
  app = getApps().find(a => a.name === ADMIN_APP_NAME)!;
} else {
  // This is the recommended approach for server environments like Vercel or Cloud Run
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT
    ?? (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
        ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
        : undefined);

  if (!serviceAccountRaw) {
    throw new Error('Firebase Admin SDK credentials are not set. Please set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_BASE64 environment variables.');
  }

  const serviceAccount = JSON.parse(serviceAccountRaw);

  app = initializeApp({
    credential: cert(serviceAccount)
  }, ADMIN_APP_NAME);
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
