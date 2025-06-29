
import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { getStorage, Bucket } from 'firebase-admin/storage';

const BUCKET_NAME = 'santa-brisa-crm.appspot.com';

let adminApp: App;
let adminStorageBucket: Bucket;

function initializeAdmin() {
  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: applicationDefault(),
      storageBucket: BUCKET_NAME,
    });
  } else {
    adminApp = getApps()[0];
  }
  adminStorageBucket = getStorage(adminApp).bucket(BUCKET_NAME);
}

export const getAdminBucket = (): Bucket => {
    if (!adminStorageBucket) {
        initializeAdmin();
    }
    return adminStorageBucket;
}
