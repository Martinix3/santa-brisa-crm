'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a file from a data URI to a specified path in Firebase Storage.
 * This server action bypasses client-side CORS issues.
 * @param dataUri The file encoded as a data URI.
 * @param pathPrefix The folder path in the storage bucket (e.g., 'invoices/purchases/purchaseId').
 * @param originalFileName The original name of the file, used for display.
 * @returns An object containing the public download URL and the original file name.
 */
export async function uploadFileFromDataUri(
  dataUri: string,
  pathPrefix: string,
  originalFileName: string
): Promise<{ downloadURL: string; fileName: string }> {
  try {
    const fileExtension = originalFileName.split('.').pop() || 'bin';
    // Generate a unique name to prevent overwrites, but keep the extension.
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const fullPath = `${pathPrefix}/${uniqueFileName}`;
    
    const storageRef = ref(storage, fullPath);

    // Extract the content type from the data URI for the upload metadata.
    const contentType = dataUri.substring(dataUri.indexOf(':') + 1, dataUri.indexOf(';'));

    const uploadResult = await uploadString(storageRef, dataUri, 'data_url', {
      contentType: contentType,
    });
    
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Return the original file name for storing in Firestore, which is more user-friendly.
    return { downloadURL, fileName: originalFileName };
  } catch (error: any) {
    console.error("Error in uploadFileFromDataUri service:", error);
    // Provide a more specific error message if available
    const errorMessage = error.code || error.message || "Failed to upload file to storage.";
    throw new Error(`Upload failed: ${errorMessage}`);
  }
}
