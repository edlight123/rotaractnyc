import { ref, uploadBytesResumable, getDownloadURL, type StorageReference } from 'firebase/storage';
import { storage } from '@/lib/firebase/client';

export type UploadPath = 'profile-photos' | 'post-attachments' | 'documents' | 'event-images' | 'gallery' | 'article-images';

interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a file to Firebase Storage.
 *
 * @param file      The File to upload
 * @param folder    The storage path prefix
 * @param subPath   Optional subfolder (e.g. userId or eventId)
 * @param onProgress  Callback with percentage 0-100
 */
export async function uploadFile(
  file: File,
  folder: UploadPath,
  subPath?: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = subPath
    ? `${folder}/${subPath}/${timestamp}_${safeName}`
    : `${folder}/${timestamp}_${safeName}`;

  const storageRef = ref(storage, storagePath);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ url, path: storagePath });
      },
    );
  });
}

/** Validate file before upload */
export function validateFile(
  file: File,
  opts: { maxSizeMB?: number; allowedTypes?: string[] } = {},
): string | null {
  const { maxSizeMB = 10, allowedTypes } = opts;
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File too large. Max ${maxSizeMB}MB.`;
  }
  if (allowedTypes && !allowedTypes.some((t) => file.type.startsWith(t))) {
    return `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
  }
  return null;
}
