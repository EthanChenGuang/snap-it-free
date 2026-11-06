import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, click, flush, jsonResponse, render } from '@/components/test/render';
import { getMessages, type AppLanguage } from '@/messages';
import { PaywallScreen } from './PaywallScreen';

const auth = vi.hoisted(() => ({ state: { user: null as { id: string } | null, email: null as string | null, loading: false } }));
vi.mock('@/lib/auth/useAuthSession', () => ({ useAuthSession: () => auth.state }));

const signOut = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signOut } }) }));

class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  auth.state = { user: { id: 'user-1' }, email: 'wrong@example.test', loading: false };
  signOut.mockClear();
  window.sessionStorage.clear();
});
afterEach(async () => {
  await cleanup();
  vi.unstubAllGlobals();
});

const subscriptionStatus = (active: boolean) =>
  vi.fn(async () => jsonResponse(200, { signedIn: true, active }));
const switchButton = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('[data-testid="paywall-switch-account"]');

describe('PaywallScreen account switch', () => {
  it.each<AppLanguage>(['en', 'it', 'zh'])('names the account that will pay, next to the CTA (%s)', async (language) => {
    vi.stubGlobal('fetch', subscriptionStatus(false));
    const container = await render(<PaywallScreen titleId="paywall-title" onFinish={() => {}} />, language);
    await flush();

    const copy = getMessages(language).onboarding.account;
    expect(container.querySelector('[data-testid="paywall-paying-as"]')?.textContent).toContain(copy.payingAs('wrong@example.test'));
    expect(switchButton(container)?.textContent).toBe(copy.switchAccount);
  });

  it('shows no account line when signed out', async () => {
    auth.state = { user: null, email: null, loading: false };
    vi.stubGlobal('fetch', subscriptionStatus(false));
    const container = await render(<PaywallScreen titleId="paywall-title" onFinish={() => {}} />);
    await flush();

    expect(container.querySelector('[data-testid="paywall-paying-as"]')).toBeNull();
    expect(switchButton(container)).toBeNull();
  });

  it('signs out on this device only and offers sign-in again instead of checkout', async () => {
    vi.stubGlobal('fetch', subscriptionStatus(false));
    const container = await render(<PaywallScreen titleId="paywall-title" onFinish={() => {}} />);
    await flush();

    await click(switchButton(container));
    await flush();

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(container.textContent).toContain(getMessages('en').paywall.signInTitle);
    expect(container.querySelector('[data-testid="paywall-google"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="paywall-cta"]')).toBeNull();
  });

  it('lets an already-subscribed account switch to another one', async () => {
    vi.stubGlobal('fetch', subscriptionStatus(true));
    const container = await render(<PaywallScreen titleId="paywall-title" onFinish={() => {}} />);
    await flush();

    expect(container.querySelector('[data-testid="paywall-subscribed-account"]')?.textContent).toContain('wrong@example.test');
    await click(switchButton(container));
    await flush();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain(getMessages('en').paywall.signInTitle);
    expect(container.textContent).not.toContain(getMessages('en').paywall.alreadySubscribedTitle);
  });
});
