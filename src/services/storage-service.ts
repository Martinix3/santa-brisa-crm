'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const fullPath = `${pathPrefix}/${uniqueFileName}`;
    
    const storageRef = ref(storage, fullPath);

    const match = dataUri.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error('Invalid data URI format.');
    }
    
    const contentType = match[1];
    const base64Data = match[2];
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Use uploadBytes which is more robust for binary data
    const uploadResult = await uploadBytes(storageRef, buffer, {
      contentType: contentType,
    });
    
    const downloadURL = await getDownloadURL(uploadResult.ref);

    return { downloadURL, fileName: originalFileName };
  } catch (error: any) {
    console.error("Error in uploadFileFromDataUri service:", error);
    // Provide a more specific error message if available
    const errorMessage = error.code || error.message || "Failed to upload file to storage.";
    throw new Error(`Upload failed: ${errorMessage}`);
  }
}
