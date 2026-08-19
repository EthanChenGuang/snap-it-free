/**
 * In-memory photo handoff across client-side navigation (/post → /select-location → /post).
 *
 * sessionStorage alone is not enough: it caps around 5 MB, so real camera photos either
 * blow the quota or must be downscaled below usable quality. Module state survives
 * router.push within the same document, so it carries the original Files losslessly and
 * the compressed sessionStorage copy is only needed after a hard reload.
 */
let cachedPhotoFiles: File[] = [];

export function getCachedDraftPhotos(): File[] {
  return cachedPhotoFiles;
}

export function setCachedDraftPhotos(files: File[]): void {
  cachedPhotoFiles = files;
}

export function clearCachedDraftPhotos(): void {
  cachedPhotoFiles = [];
}
