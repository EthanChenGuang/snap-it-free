/** D-96: union localStorage favorites with remote Supabase IDs (dedupe). */
export function mergeFavoriteIds(local: string[], remote: string[]): string[] {
  return [...new Set([...local, ...remote])];
}
