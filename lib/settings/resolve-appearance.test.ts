import { describe, expect, it } from 'vitest';
import {
  appearanceUsesDarkClass,
  forcedThemeFromAppearance,
  resolveEffectiveTheme,
} from '@/lib/settings/resolve-appearance';

describe('resolveEffectiveTheme', () => {
  it('respects explicit light and dark', () => {
    expect(resolveEffectiveTheme('light', true)).toBe('light');
    expect(resolveEffectiveTheme('dark', false)).toBe('dark');
  });

  it('follows system preference when appearance is system', () => {
    expect(resolveEffectiveTheme('system', true)).toBe('dark');
    expect(resolveEffectiveTheme('system', false)).toBe('light');
  });
});

describe('appearanceUsesDarkClass', () => {
  it('maps effective theme to dark class usage', () => {
    expect(appearanceUsesDarkClass('light', true)).toBe(false);
    expect(appearanceUsesDarkClass('system', true)).toBe(true);
  });
});

describe('forcedThemeFromAppearance', () => {
  it('returns undefined for system so next-themes can follow OS', () => {
    expect(forcedThemeFromAppearance('system')).toBeUndefined();
  });

  it('returns explicit themes when not system', () => {
    expect(forcedThemeFromAppearance('light')).toBe('light');
    expect(forcedThemeFromAppearance('dark')).toBe('dark');
  });
});
