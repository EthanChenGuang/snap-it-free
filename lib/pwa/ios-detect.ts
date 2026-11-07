export function isIOS(): boolean {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  // iPadOS 13+ reports a desktop Mac user agent; a touch screen gives it away.
  return /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}

export function isStandalonePwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error legacy iOS Safari standalone flag
    navigator.standalone === true
  );
}

export function canOfferPush(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export const IOS_PUSH_DISMISS_KEY = 'shoumanwu_ios_push_dismissed';
export const IOS_GUIDE_SESSION_KEY = 'shoumanwu_ios_guide_shown_session';

export function isIosPushDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(IOS_PUSH_DISMISS_KEY) === '1';
}

export function setIosPushDismissed(): void {
  localStorage.setItem(IOS_PUSH_DISMISS_KEY, '1');
}

export function wasIosGuideShownThisSession(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(IOS_GUIDE_SESSION_KEY) === '1';
}

export function markIosGuideShownThisSession(): void {
  sessionStorage.setItem(IOS_GUIDE_SESSION_KEY, '1');
}

/** D-110: push permission only after login and (standalone OR dismissed guide) on iOS. */
export function canRequestPushPermission(isLoggedIn: boolean): boolean {
  if (!isLoggedIn) return false;
  if (isIOS()) {
    return isStandalonePwa() || isIosPushDismissed();
  }
  return true;
}

/**
 * Whether "Turn on alerts" can actually work in this tab. iOS browsers only get web push once the app is
 * opened from the Home Screen; other browsers need the Push API. Onboarding skips its alerts step when false.
 */
export function canUsePushHere(): boolean {
  if (isIOS() && !isStandalonePwa()) return false;
  return canOfferPush();
}

export function needsIosInstallGuide(): boolean {
  return isIOS() && !isStandalonePwa() && !isIosPushDismissed();
}
