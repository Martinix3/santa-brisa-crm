
import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = 'santa-brisa-crm.firebasestorage.app';

function getFirebaseAdminApp(): App {
    // If the app is already initialized, return it.
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    // Otherwise, initialize the app with explicit credentials from the environment.
    return initializeApp({
        credential: applicationDefault(),
        storageBucket: BUCKET_NAME,
    });
}

// Export a memoized instance of the storage bucket
export const adminBucket = getStorage(getFirebaseAdminApp()).bucket(BUCKET_NAME);
