import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectBrowserLanguage } from '@/lib/i18n/detect-browser-language';

describe('detectBrowserLanguage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps zh-CN to zh', () => {
    vi.stubGlobal('navigator', { language: 'zh-CN' });
    expect(detectBrowserLanguage()).toBe('zh');
  });

  it('maps it-IT to it', () => {
    vi.stubGlobal('navigator', { language: 'it-IT' });
    expect(detectBrowserLanguage()).toBe('it');
  });

  it('maps en-US to en', () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    expect(detectBrowserLanguage()).toBe('en');
  });

  it('falls back to zh for unsupported locales like fr-FR', () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    expect(detectBrowserLanguage()).toBe('zh');
  });
});
