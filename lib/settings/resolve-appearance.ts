import type { AppearanceMode } from '@/lib/settings/preferences';

export function resolveEffectiveTheme(
  appearance: AppearanceMode,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (appearance === 'dark') return 'dark';
  if (appearance === 'light') return 'light';
  return prefersDark ? 'dark' : 'light';
}

export function appearanceUsesDarkClass(
  appearance: AppearanceMode,
  prefersDark: boolean,
): boolean {
  return resolveEffectiveTheme(appearance, prefersDark) === 'dark';
}

export function forcedThemeFromAppearance(
  appearance: AppearanceMode,
): 'light' | 'dark' | undefined {
  if (appearance === 'system') return undefined;
  return appearance;
}

/** Inline script: apply `dark` on <html> before React hydrates to avoid FOUC. */
export const APPEARANCE_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem('shoumanwu_app_preferences');var appearance='system';if(raw){var parsed=JSON.parse(raw);if(parsed&&parsed.appearance)appearance=parsed.appearance;}var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=appearance==='dark'||(appearance==='system'&&prefersDark);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;
