import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// CORRECT BUCKET NAME
const BUCKET_NAME = 'santa-brisa-crm.firebasestorage.app';

function getFirebaseAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    // Explicitly use Application Default Credentials. This is more robust for App Hosting.
    return initializeApp({
        credential: applicationDefault()
    });
}

// Export a memoized instance of the storage bucket
export const adminBucket = getStorage(getFirebaseAdminApp()).bucket(BUCKET_NAME);
