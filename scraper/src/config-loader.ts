/** Merge DB target URLs over env/category fallback when DB is empty (D-18). */
export function mergeTargetUrls(
  dbUrls: string[] | null | undefined,
  fallbackUrls: readonly string[],
): string[] {
  if (dbUrls != null && dbUrls.length > 0) {
    return [...dbUrls];
  }
  return [...fallbackUrls];
}
