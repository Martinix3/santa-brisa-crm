import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = 'santa-brisa-crm.appspot.com';

let app: App;

if (getApps().length === 0) {
  try {
    app = initializeApp({
      storageBucket: BUCKET_NAME,
    });
    console.info({
        event: 'firebase_admin_init_success',
        message: "Firebase Admin SDK initialized using environment's default credentials.",
        bucket: BUCKET_NAME,
    });
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", {
        errorMessage: error.message,
        docs: "https://firebase.google.com/docs/admin/setup",
    });
    if (error.message.includes('Google Application Default Credentials are not available')) {
      console.error("Hint: This usually means you're running locally. Run `gcloud auth application-default login` in your terminal and try again.");
    }
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
} else {
    app = getApps()[0];
}

export const adminDb = getFirestore(app);
export const adminBucket = getStorage(app).bucket(BUCKET_NAME);
