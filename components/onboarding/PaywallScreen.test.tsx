import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, click, flush, jsonResponse, render } from '@/components/test/render';
import { getMessages, type AppLanguage } from '@/messages';
import { PaywallScreen } from './PaywallScreen';

afterEach(async () => {
  await cleanup();
  vi.unstubAllGlobals();
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
});
