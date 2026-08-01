export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
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

export function needsIosInstallGuide(): boolean {
  return isIOS() && !isStandalonePwa() && !isIosPushDismissed();
}
