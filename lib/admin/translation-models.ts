export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash';

export function resolveGeminiModel(explicit?: string): string {
  return explicit?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function resolveOpenRouterModel(explicit?: string): string {
  return explicit?.trim() || process.env.OPENROUTER_FALLBACK_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
}
