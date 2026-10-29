import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, click, flush, jsonResponse, render } from '@/components/test/render';
import { getMessages, type AppLanguage } from '@/messages';
import { PaywallScreen } from './PaywallScreen';

afterEach(async () => {
  await cleanup();
  vi.unstubAllGlobals();
});

// jsdom has no IntersectionObserver; ListingPhoto (blurred strip) needs one.
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
});

const cta = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('[data-testid="paywall-cta"]');
const alertText = (container: HTMLElement) => container.querySelector('[role="alert"]')?.textContent ?? null;

describe('PaywallScreen checkout failures', () => {
  it.each<AppLanguage>(['en', 'it', 'zh'])('shows the localized checkout error when Stripe fails upstream (%s)', async (language) => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(502, { error: 'stripe_error' })));
    const container = await render(<PaywallScreen titleId="paywall-title" onFinish={() => {}} />, language);

    await click(cta(container));
    await flush();

    expect(alertText(container)).toBe(getMessages(language).paywall.checkoutError);
    expect(cta(container)?.disabled).toBe(false);
  });

  it('treats an empty 500 the same way and lets the user retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(jsonResponse(503, { error: 'payments_disabled' }));
    vi.stubGlobal('fetch', fetchMock);
    const container = await render(<PaywallScreen titleId="paywall-title" onFinish={() => {}} />);

    await click(cta(container));
    await flush();
    expect(alertText(container)).toBe(getMessages('en').paywall.checkoutError);

    await click(cta(container));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain(getMessages('en').paywall.comingSoonTitle);
    expect(alertText(container)).toBeNull();
  });

  it('shows no error before the user has tried', async () => {
    const container = await render(<PaywallScreen titleId="paywall-title" onFinish={() => {}} />);
    expect(alertText(container)).toBeNull();
  });

  it.each<[AppLanguage, string]>([
    ['en', 'Unlock my feed'],
    ['it', 'Sblocca il mio feed'],
    ['zh', '解锁我的推荐'],
  ])('labels the CTA "%s → %s"', async (language, label) => {
    expect(getMessages(language).paywall.cta).toBe(label);
    const container = await render(<PaywallScreen titleId="paywall-title" onFinish={() => {}} />, language);
    expect(cta(container)?.textContent).toBe(label);
  });
});

describe('PaywallScreen personalization (honest, real figures)', () => {
  it('uses the real count + city in the headline, the computed saving, billed line and proof', async () => {
    const container = await render(
      <PaywallScreen
        titleId="paywall-title"
        onFinish={() => {}}
        context={{ cityLabel: 'Venezia', count: 23, photos: ['https://x/1.jpg'], proofCount: 42 }}
      />,
    );
    const title = container.querySelector('#paywall-title')?.textContent ?? '';
    expect(title).toContain('23');
    expect(title).toContain('Venezia');
    // Saving is arithmetically true and floored (never overstated): €19.99 vs €4.99×12 → 66%.
    expect(container.querySelector('[data-testid="paywall-savings"]')?.textContent).toContain('66');
    expect(container.querySelector('[data-testid="paywall-billed"]')?.textContent).toContain('€19.99');
    expect(container.querySelector('[data-testid="paywall-proof"]')?.textContent).toContain('42');
    expect(container.querySelector('[data-testid="paywall-photo-strip"]')).not.toBeNull();
  });

  it('falls back to a generic headline and hides the proof line when there is no real count', async () => {
    const container = await render(
      <PaywallScreen
        titleId="paywall-title"
        onFinish={() => {}}
        context={{ cityLabel: 'Veneto', count: null, photos: [], proofCount: null }}
      />,
    );
    expect(container.querySelector('#paywall-title')?.textContent).toBe(getMessages('en').paywall.titleFallback);
    expect(container.querySelector('[data-testid="paywall-proof"]')).toBeNull();
  });
});
