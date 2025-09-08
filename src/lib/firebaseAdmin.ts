import 'server-only';
import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-instance';

let app: App;

const existing = getApps().find(a => a.name === ADMIN_APP_NAME);
if (existing) {
  app = existing;
} else {
  const hasEnvCreds = !!process.env.FIREBASE_CLIENT_EMAIL && !!process.env.FIREBASE_PRIVATE_KEY;

  app = initializeApp(
    hasEnvCreds
      ? {
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID_PROD || 'santa-brisa-crm',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
          }),
        }
      : {
          // Fallback: ADC (Workstations/Cloud Run/Hosting con cuenta de servicio del entorno)
          credential: applicationDefault(),
          projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID_PROD || 'santa-brisa-crm',
        },
    ADMIN_APP_NAME
  );

  console.log(
    hasEnvCreds
      ? 'Firebase Admin con Service Account (env).'
      : 'Firebase Admin con Application Default Credentials (ADC).'
  );
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
