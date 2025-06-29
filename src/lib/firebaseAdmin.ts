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

// Get a memoized instance of the storage service and use the default bucket
// that was configured during app initialization. This is safer.
export const adminBucket = getStorage(app).bucket();
