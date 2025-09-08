
// src/lib/firebaseAdmin.ts
import 'server-only';
import { initializeApp, getApps, App, cert, type AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-instance';

let app: App;

const existing = getApps().find(a => a.name === ADMIN_APP_NAME);
if (existing) {
  app = existing;
} else {
  // --- Leemos credenciales de Service Account desde ENV ---
  const saJson =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
      ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
      : null);

  if (!saJson) {
    // No permitimos caer a ADC: así evitamos invalid_rapt en server actions
    throw new Error(
      'Missing Service Account credentials. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_BASE64.'
    );
  }

  const appOptions: AppOptions = {
    credential: cert(JSON.parse(saJson)),
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'santa-brisa-crm',
  };

  console.log('Initializing Firebase Admin with explicit Service Account credentials.');
  app = initializeApp(appOptions, ADMIN_APP_NAME);
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
