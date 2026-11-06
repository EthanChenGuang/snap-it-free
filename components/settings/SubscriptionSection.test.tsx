import { afterEach, describe, expect, it, vi } from 'vitest';
import { byText, cleanup, click, flush, jsonResponse, render } from '@/components/test/render';
import { getMessages, type AppLanguage } from '@/messages';
import { SubscriptionSection } from './SubscriptionSection';

afterEach(async () => {
  await cleanup();
  vi.unstubAllGlobals();
});

const STATUS = { configured: true, signedIn: true, active: true, hasCustomer: true, plan: 'monthly', cancelAtPeriodEnd: false };

describe('SubscriptionSection Manage subscription', () => {
  it.each<AppLanguage>(['en', 'it', 'zh'])('shows the localized portal error when Stripe fails and allows a retry (%s)', async (language) => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      String(input) === '/api/subscription' ? jsonResponse(200, STATUS) : jsonResponse(502, { error: 'stripe_error' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const copy = getMessages(language).subscription;
    const container = await render(<SubscriptionSection />, language);
    await flush();

    const manage = byText(container, 'button span span', copy.manage)?.closest('button') ?? null;
    await click(manage);
    await flush();

    expect(container.textContent).toContain(copy.portalError);
    expect(manage?.hasAttribute('disabled')).toBe(false);
  });
});
