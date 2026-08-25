import {
  compressPhotoForDraft,
  dataUrlToPhotoFile,
} from '@/lib/post-draft/storage';
import { MAX_UPLOAD_BYTES } from '@/lib/ugc/schemas';

/** Downscale large camera photos before POST /api/ugc/upload (5 MB cap). */
export async function preparePhotoForUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) {
    return file;
  }

  const dataUrl = await compressPhotoForDraft(file);
  if (!dataUrl) {
    throw new Error('Photo could not be prepared for upload');
  }

  const compressed = await dataUrlToPhotoFile(dataUrl);
  if (!compressed || compressed.size > MAX_UPLOAD_BYTES) {
    throw new Error('Photo is too large after compression');
  }

  return compressed;
}
