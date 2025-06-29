import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// The bucket name for a Firebase project is typically <project-id>.appspot.com
const BUCKET_NAME = 'santa-brisa-crm.appspot.com';

let app: App;
if (getApps().length === 0) {
    app = initializeApp({
        credential: applicationDefault(),
        storageBucket: BUCKET_NAME,
    });
} else {
    app = getApps()[0];
}

// Explicitly provide the bucket name to the bucket() method to avoid initialization errors in some server environments.
export const adminBucket = getStorage(app).bucket(BUCKET_NAME);
