import type { AppearanceMode } from '@/lib/settings/preferences';

export function resolveEffectiveTheme(appearance: AppearanceMode): 'light' | 'dark' {
  return appearance;
}

export function appearanceUsesDarkClass(appearance: AppearanceMode): boolean {
  return appearance === 'dark';
}

export function forcedThemeFromAppearance(appearance: AppearanceMode): 'light' | 'dark' {
  return appearance;
}

/** Inline script: apply `dark` on <html> before React hydrates to avoid FOUC. */
export const APPEARANCE_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem('shoumanwu_app_preferences');var appearance='light';if(raw&&raw.trim()){var parsed=JSON.parse(raw);if(parsed&&parsed.appearance==='dark')appearance='dark';else if(parsed&&parsed.appearance==='system'){appearance=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}}var dark=appearance==='dark';document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;
