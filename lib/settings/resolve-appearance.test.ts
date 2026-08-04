import { describe, expect, it } from 'vitest';
import {
  appearanceUsesDarkClass,
  forcedThemeFromAppearance,
  resolveEffectiveTheme,
} from '@/lib/settings/resolve-appearance';

describe('resolveEffectiveTheme', () => {
  it('returns light or dark directly', () => {
    expect(resolveEffectiveTheme('light')).toBe('light');
    expect(resolveEffectiveTheme('dark')).toBe('dark');
  });
});

describe('appearanceUsesDarkClass', () => {
  it('maps dark appearance to dark class', () => {
    expect(appearanceUsesDarkClass('light')).toBe(false);
    expect(appearanceUsesDarkClass('dark')).toBe(true);
  });
});

describe('forcedThemeFromAppearance', () => {
  it('always returns an explicit theme', () => {
    expect(forcedThemeFromAppearance('light')).toBe('light');
    expect(forcedThemeFromAppearance('dark')).toBe('dark');
  });
});
