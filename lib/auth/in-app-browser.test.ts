import { describe, expect, it } from 'vitest';
import { isInAppBrowser } from './in-app-browser';

const SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const WKWEBVIEW = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const INSTAGRAM = `${WKWEBVIEW} Instagram 350.0.0`;
const WECHAT = `${SAFARI} MicroMessenger/8.0.50`;
const ANDROID_WV =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

describe('isInAppBrowser', () => {
  it('treats real browsers as normal', () => {
    expect(isInAppBrowser(SAFARI)).toBe(false);
    expect(isInAppBrowser(CHROME_IOS)).toBe(false);
    expect(isInAppBrowser(ANDROID_CHROME)).toBe(false);
    expect(isInAppBrowser('')).toBe(false);
  });

  it('flags known in-app browsers and bare WebViews', () => {
    expect(isInAppBrowser(WKWEBVIEW)).toBe(true);
    expect(isInAppBrowser(INSTAGRAM)).toBe(true);
    expect(isInAppBrowser(WECHAT)).toBe(true);
    expect(isInAppBrowser(ANDROID_WV)).toBe(true);
  });
});
