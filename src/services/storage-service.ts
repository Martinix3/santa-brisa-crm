
'use server';

import { getAdminBucket } from '@/lib/firebaseAdmin';

/**
 * Uploads a file from a data URI to a specified path in Firebase Storage.
 * @param dataUri The data URI of the file to upload.
 * @param path The destination path in the storage bucket (e.g., 'invoices/purchases/some-id/invoice.pdf').
 * @returns An object with the public download URL, storage path, and content type.
 */
export async function uploadInvoice(dataUri: string, purchaseId: string): Promise<{ downloadUrl: string; storagePath: string; contentType: string }> {
  try {
    const adminBucket = getAdminBucket();

    const matches = dataUri.match(/^data:(.+);base64,(.*)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Formato de data URI inválido.');
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileExtension = contentType.split('/')[1] || 'bin';
    const path = `invoices/purchases/${purchaseId}/invoice_${Date.now()}.${fileExtension}`;
    
    console.log(`Uploading invoice to: ${path}`);

    const file = adminBucket.file(path);
    await file.save(buffer, {
      contentType: contentType,
      resumable: false,
    });
    
    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '01-01-2100' // A long-lived URL
    });

    console.log(`File uploaded. Signed URL generated.`);
    return { downloadUrl: signedUrl, storagePath: path, contentType: contentType };

  } catch (err: any) {
    console.error(`Error uploading to Firebase Storage:`, err);
    throw new Error(`Failed to upload to storage: ${err.message}`);
  }
}
