import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byText, cleanup, click, flush, jsonResponse, render } from '@/components/test/render';
import { getMessages, type AppLanguage } from '@/messages';
import { LockedFeed, LockedPanel } from './LockedViews';

const auth = vi.hoisted(() => ({ state: { user: null as { id: string } | null, email: null as string | null, loading: false } }));
vi.mock('@/lib/auth/useAuthSession', () => ({ useAuthSession: () => auth.state }));

const signedOut = () => (auth.state = { user: null, email: null, loading: false });
const signedIn = () => (auth.state = { user: { id: 'user-1' }, email: 'u@example.test', loading: false });

beforeEach(signedOut);
afterEach(async () => {
  await cleanup();
  vi.unstubAllGlobals();
});

const signInLink = (container: HTMLElement, language: AppLanguage = 'en') =>
  byText(container, 'a', getMessages(language).locked.signIn);

describe('checkout return on a locked view', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('keeps the activation-can-take-a-minute notice when Stripe returns but the feed is still locked', async () => {
    window.history.replaceState(null, '', '/?checkout=success');
    const copy = getMessages('en').locked;
    const container = await render(<LockedFeed count={12} photos={[]} />);
    expect(container.querySelector('[data-testid="checkout-pending"]')?.textContent).toBe(copy.checkoutPending);
  });

  it('does not treat a cancelled Checkout as a pending activation', async () => {
    window.history.replaceState(null, '', '/?checkout=cancel');
    const container = await render(<LockedFeed count={12} photos={[]} />);
    expect(container.querySelector('[data-testid="checkout-pending"]')).toBeNull();
  });
});

describe('Locked card account prompt', () => {
  it('asks a signed-out visitor to sign in, linking to Settings', async () => {
    const container = await render(<LockedFeed count={12} photos={[]} />);
    expect(container.textContent).toContain(getMessages('en').locked.signInHint);
    expect(signInLink(container)?.getAttribute('href')).toBe('/settings');
  });

  it.each<AppLanguage>(['en', 'it', 'zh'])('never asks a signed-in user to sign in (%s)', async (language) => {
    signedIn();
    const copy = getMessages(language).locked;
    for (const ui of [<LockedFeed key="feed" count={12} photos={[]} />, <LockedPanel key="detail" variant="detail" />, <LockedPanel key="fav" variant="favorites" />]) {
      const container = await render(ui, language);
      expect(signInLink(container, language)).toBeNull();
      expect(byText(container, 'button', copy.refreshStatus)).not.toBeNull();
    }
  });

  it('lets a signed-in user re-check the subscription and explains when nothing is active yet', async () => {
    signedIn();
    const fetchMock = vi.fn(async () => jsonResponse(200, { configured: true, signedIn: true, active: false, hasCustomer: false }));
    vi.stubGlobal('fetch', fetchMock);
    const copy = getMessages('en').locked;
    const container = await render(<LockedFeed count={12} photos={[]} />);

    await click(byText(container, 'button', copy.refreshStatus));
    await flush();

    expect(fetchMock).toHaveBeenCalledWith('/api/subscription', { cache: 'no-store' });
    expect(container.textContent).toContain(copy.refreshNothing);
  });

  it('shows neither prompt while the session is still loading', async () => {
    auth.state = { user: null, email: null, loading: true };
    const copy = getMessages('en').locked;
    const container = await render(<LockedFeed count={12} photos={[]} />);
    expect(signInLink(container)).toBeNull();
    expect(byText(container, 'button', copy.refreshStatus)).toBeNull();
  });
});
