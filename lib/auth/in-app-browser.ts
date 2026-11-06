/**
 * Best-effort detection of embedded app browsers (WebViews) where Google OAuth is blocked
 * ("disallowed_useragent") and where an emailed sign-in link opens in a different browser.
 * SFSafariViewController looks exactly like Safari and is not detected (Google works there).
 */
const IN_APP_PATTERNS = [
  /FBAN|FBAV|FB_IAB/i, // Facebook / Messenger
  /Instagram/i,
  /\bLine\//i,
  /MicroMessenger/i, // WeChat
  /WhatsApp/i,
  /Snapchat/i,
  /TikTok|musical_ly|BytedanceWebview/i,
  /LinkedInApp/i,
  /Twitter/i,
  /; wv\)/i, // Android WebView
];

export function isInAppBrowser(userAgent: string): boolean {
  if (!userAgent) return false;
  if (IN_APP_PATTERNS.some((pattern) => pattern.test(userAgent))) return true;
  // iOS WKWebView: an iPhone/iPad WebKit UA that lacks the "Safari/" token (and is not Chrome/Firefox for iOS).
  const isIos = /iPhone|iPad|iPod/i.test(userAgent);
  return isIos && /AppleWebKit/i.test(userAgent) && !/Safari\//i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent);
}
