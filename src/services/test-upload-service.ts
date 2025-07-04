

'use server';

import { getAdminBucket } from '@/lib/firebaseAdmin';

/**
 * Uploads a test file to a dedicated /test directory in Firebase Storage.
 * @param fileData An object containing the data URI and content type of the file.
 * @returns A promise that resolves to an object with the public URL or an error message.
 */
export async function testUpload(fileData: { dataUri: string; contentType: string; }): Promise<{ url: string } | { error: string }> {
  try {
    const adminBucket = await getAdminBucket();
    const { dataUri, contentType } = fileData;
    
    // Extract base64 data and MIME type from data URI
    const matches = dataUri.match(/^data:(.+);base64,(.*)$/);
    if (!matches || matches.length !== 3) {
      return { error: 'Formato de data URI inválido.' };
    }
    
    const buffer = Buffer.from(matches[2], 'base64');
    const fileExtension = contentType.split('/')[1] || 'txt';
    const fileName = `test-upload-${Date.now()}.${fileExtension}`;
    const filePath = `test/${fileName}`;

    console.log(`[Test Upload] Attempting to upload to: ${filePath}`);

    const file = adminBucket.file(filePath);
    
    await file.save(buffer, {
      contentType: contentType,
      resumable: false,
    });
    
    // Generate a long-lived signed URL instead of making the file public
    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '01-01-2100' // A very distant future date
    });
    
    console.log(`[Test Upload] Success. File available at signed URL.`);

    return { url: signedUrl };

  } catch (error: any) {
    console.error('[Test Upload] Error during upload process:', error);
    return { error: error.message || 'Error desconocido en el servidor.' };
  }
}
