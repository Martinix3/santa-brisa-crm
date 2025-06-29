import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// The bucket name for a Firebase project is typically <project-id>.appspot.com
const BUCKET_NAME = 'santa-brisa-crm.appspot.com';

function getFirebaseAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    // Explicitly use Application Default Credentials and define the storage bucket.
    // This is a robust way to initialize for server environments like App Hosting.
    return initializeApp({
        credential: applicationDefault(),
        storageBucket: BUCKET_NAME,
    });
}

// Get a memoized instance of the storage service and use the default bucket
// that was configured during app initialization. This is safer than specifying the name again.
export const adminBucket = getStorage(getFirebaseAdminApp()).bucket();
