import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { cleanup, click, flush, render } from '@/components/test/render';
import { writeAppPreferences } from '@/lib/settings/preferences';
import { FILTER_PREFS_STORAGE_KEY } from '@/lib/filter-prefs/storage';
import { ONBOARDING_COMPLETED_STORAGE_KEY } from '@/lib/paywall/gate';
import { ONBOARDING_RESUME_STORAGE_KEY } from '@/lib/paywall/onboarding-flow';
import { OnboardingFlow } from './OnboardingFlow';

const auth = vi.hoisted(() => ({ user: null as null | { id: string }, email: null as null | string }));

vi.mock('motion/react', () => {
  const passthrough = (tag: string) => {
    const Component = ({ children, initial, animate, exit, transition, ...rest }: Record<string, unknown>) => {
      void initial; void animate; void exit; void transition;
      const El = tag as unknown as React.ElementType;
      return <El {...rest}>{children as React.ReactNode}</El>;
    };
    return Component;
  };
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
    motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }),
  };
});
vi.mock('@/components/onboarding/useOnboardingData', () => {
  const photos = [1, 2, 3, 4].map((n) => ({ key: `p${n}`, url: `https://images.sbito.it/x/${n}?rule=card-mobile-new-small-2x-auto`, alt: '' }));
  return {
    useRegionTeaser: () => ({
      status: 'ready', venetoCount: 1200, venetoNew7d: 340, collage: photos,
      daily: [0, 1, 2, 3, 4, 5, 6].map((n) => ({ dayStart: Date.UTC(2026, 10, 9 + n), count: 40 + n })), newestMs: Date.now(), cityCount: 6,
      map: { total: 5000, cities: [{ city: 'venice', count: 900, lngLat: [12.3, 45.4] }, { city: 'milan', count: 1100, lngLat: [9.2, 45.5] }] },
    }),
    useCityTeaser: () => ({ status: 'ready', count: 12, photos }),
  };
});
vi.mock('@/components/providers/PwaOnboardingProvider', () => ({
  usePwaOnboarding: () => ({ openInstallGuide: () => {}, setAutoOpenSuspended: () => {} }),
}));
vi.mock('@/lib/auth/useAuthSession', () => ({
  useAuthSession: () => ({ user: auth.user, email: auth.email, loading: false }),
}));
vi.mock('@/lib/auth/use-oauth-sign-in', () => ({ useOAuthSignIn: () => ({ signIn: vi.fn(), status: 'idle', isBusy: false }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));
vi.mock('@/lib/supabase/env', () => ({ getSupabaseEnv: () => null }));
vi.mock('@/lib/pwa/ios-detect', () => ({ canUsePushHere: () => true }));
vi.mock('@/components/listings/FeedSearching', () => ({ FeedSearching: () => null }));
vi.mock('@/components/listings/ListingPhoto', () => ({ ListingPhoto: () => null }));
vi.mock('@/components/shell/CompactLocaleChip', () => ({ CompactLocaleChip: () => null }));

/** Words that sell or mention the paid product (case-insensitive). */
const PAID_WORDS = [
  '€', '1.99', '4.99', '19.99', 'plus', '订阅', '付费', '解锁', '试用', 'subscription', 'subscribe', 'unlock',
  'trial', 'premium', 'abbonamento', 'abbonati', 'sblocca', 'prova gratuita',
];

const text = () => document.body.querySelector('[data-testid="onboarding-overlay"]')?.textContent ?? '';
const screen = () => document.body.querySelector('[data-testid="onboarding-overlay"]')?.getAttribute('data-screen');
const byTestId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`);

function expectNoPaidWording(where: string) {
  const content = text().toLowerCase();
  for (const word of PAID_WORDS) expect(content.includes(word.toLowerCase()), `${where}: found "${word}"`).toBe(false);
}

async function walkToAccount(language: 'zh' | 'en' | 'it', onFinish = vi.fn(), free = true) {
  await render(<OnboardingFlow onFinish={onFinish} />, language);
  await flush();
  const seen: string[] = [];
  const visit = async (expected: string) => {
    expect(screen()).toBe(expected);
    seen.push(expected);
    if (free) expectNoPaidWording(`${language}/${expected}`);
  };
  await visit('hook');
  const withContact = language !== 'it';
  for (const step of ['how', 'weekly', 'map', 'favorites', ...(withContact ? ['contact'] : []), 'trust', 'interests']) {
    await click(byTestId('onboarding-continue'));
    await visit(step);
  }
  await click(document.body.querySelector('[role="checkbox"]'));
  await click(byTestId('onboarding-continue'));
  await visit('mobility');
  await click(document.body.querySelector('[role="checkbox"]'));
  await click(byTestId('onboarding-continue'));
  await visit('city');
  await click(document.body.querySelector('[role="radio"]'));
  await click(byTestId('onboarding-continue'));
  await visit('preview');
  if (free) expect(byTestId('preview-see-plans')).toBeNull();
  await click(byTestId('preview-save'));
  await visit('account');
  return { seen, onFinish };
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_ONBOARDING_ENABLED', 'true');
  vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', '');
  auth.user = null;
  auth.email = null;
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await cleanup();
  sessionStorage.clear();
});

describe('free onboarding', () => {
  it.each(['zh', 'en', 'it'] as const)('shows no paid wording on any step up to the account step (%s)', async (language) => {
    const { seen } = await walkToAccount(language);
    expect(seen).toEqual([
      'hook', 'how', 'weekly', 'map', 'favorites', ...(language === 'it' ? [] : ['contact']),
      'trust', 'interests', 'mobility', 'city', 'preview', 'account',
    ]);
    // Signed out: sign-up is still required, no way past it.
    expect(byTestId('account-continue')).toBeNull();
    expect(byTestId('account-google')).not.toBeNull();
    expect(byTestId('account-skip')).not.toBeNull();
  });

  it('trust step uses the free rows', async () => {
    await render(<OnboardingFlow onFinish={() => {}} />, 'zh');
    await flush();
    for (let i = 0; i < 6; i += 1) await click(byTestId('onboarding-continue'));
    expect(screen()).toBe('trust');
    expect(text()).not.toContain('Stripe');
    expect(text()).toContain('浏览免费');
    // Free rows have their own icons: no receipt or lock.
    expect(text()).not.toContain('lock');
    expect(text()).not.toContain('receipt_long');
    expect(text()).toContain('handshake');
  });

  it('a signed-in visitor sees the account step as done and finishes without a paywall', async () => {
    auth.user = { id: 'u1' };
    auth.email = 'a@b.it';
    const { onFinish } = await walkToAccount('en');
    expect(byTestId('account-signed-in')).not.toBeNull();
    expect(byTestId('account-google')).toBeNull();
    await click(byTestId('account-continue'));
    expect(screen()).toBe('alerts');
    expectNoPaidWording('en/alerts');
    // "Not now" on the alerts step ends the flow.
    const notNow = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Not now');
    await click(notNow);
    await flush();
    expect(onFinish).toHaveBeenCalled();
    expect(localStorage.getItem(ONBOARDING_COMPLETED_STORAGE_KEY)).toBe('1');
    expect(document.body.querySelector('[data-testid^="paywall"]')).toBeNull();
  });

  it('a signed-out visitor can skip the account step: finishes, applies the answers, feed stays open', async () => {
    const { onFinish } = await walkToAccount('zh');
    const skip = byTestId('account-skip')!;
    expect(skip.textContent).toBe('稍后再说');
    expect(skip.className).toContain('h-11');
    await click(skip);
    await flush();
    expect(onFinish).toHaveBeenCalled();
    expect(localStorage.getItem(ONBOARDING_COMPLETED_STORAGE_KEY)).toBe('1');
    const prefs = JSON.parse(localStorage.getItem(FILTER_PREFS_STORAGE_KEY)!);
    expect(prefs.radiusKm).toBe(1);
    expect(prefs.city).not.toBe('all');
    expect(Object.keys(prefs)).toEqual(expect.arrayContaining(['city', 'categories', 'radiusKm']));
    // No alerts step (it needs an account), no paywall, nothing locked.
    expect(document.body.querySelector('[data-testid="onboarding-overlay"]')).toBeNull();
    expect(document.body.querySelector('[data-testid^="paywall"], [data-testid*="locked"]')).toBeNull();
  });

  it('a signed-in visitor sees Continue and no skip control', async () => {
    auth.user = { id: 'u1' };
    auth.email = 'a@b.it';
    await walkToAccount('en');
    expect(byTestId('account-continue')).not.toBeNull();
    expect(byTestId('account-skip')).toBeNull();
  });

  it('paid mode keeps the required sign-up: no skip control', async () => {
    vi.stubEnv('NEXT_PUBLIC_ONBOARDING_ENABLED', '');
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', 'true');
    await walkToAccount('en', vi.fn(), false);
    expect(byTestId('account-skip')).toBeNull();
    expect(byTestId('account-continue')).toBeNull();
  });

  it('resume after the OAuth redirect still lands on the account step in free mode', async () => {
    window.history.replaceState(null, '', '/?onboarding=resume');
    sessionStorage.setItem(
      ONBOARDING_RESUME_STORAGE_KEY,
      JSON.stringify({ screen: 'account', city: 'venice', interests: ['books'], mobility: 'bike', radiusKm: 5, locationGranted: false }),
    );
    auth.user = { id: 'u1' };
    auth.email = 'a@b.it';
    await render(<OnboardingFlow onFinish={() => {}} />, 'zh');
    await flush();
    expect(screen()).toBe('account');
    await click(byTestId('account-continue'));
    expect(screen()).toBe('alerts');
    window.history.replaceState(null, '', '/');
  });

  it('shows the contact step with its three rows for zh and en, and never for it', async () => {
    for (const [language, row] of [['zh', '选一条现成的意大利语消息'], ['en', 'Pick a ready-made Italian message']] as const) {
      await render(<OnboardingFlow onFinish={() => {}} />, language);
      await flush();
      for (let i = 0; i < 5; i += 1) await click(byTestId('onboarding-continue'));
      expect(screen()).toBe('contact');
      expect(byTestId('contact-rows')!.querySelectorAll('li')).toHaveLength(3);
      expect(text()).toContain(row);
      expect(text()).toContain('Ciao! È ancora disponibile?');
      expectNoPaidWording(`${language}/contact`);
      await cleanup();
    }
    await render(<OnboardingFlow onFinish={() => {}} />, 'it');
    await flush();
    for (let i = 0; i < 5; i += 1) await click(byTestId('onboarding-continue'));
    expect(screen()).toBe('trust');
    expect(byTestId('contact-rows')).toBeNull();
  });

  it('follows the language chip: dots drop by one and the contact step moves on to trust; Back skips it', async () => {
    const dots = () => document.body.querySelectorAll('header div[aria-hidden="true"] > span').length;
    await render(<OnboardingFlow onFinish={() => {}} />, 'zh');
    await flush();
    const withContact = dots();
    for (let i = 0; i < 5; i += 1) await click(byTestId('onboarding-continue'));
    expect(screen()).toBe('contact');
    await act(async () => {
      writeAppPreferences({ language: 'it' });
    });
    await flush();
    expect(screen()).toBe('trust');
    expect(dots()).toBe(withContact - 1);
    await click(document.body.querySelector('button[aria-label]') as HTMLElement); // Back
    expect(screen()).toBe('favorites');
    await cleanup();
    await render(<OnboardingFlow onFinish={() => {}} />, 'en');
    await flush();
    expect(dots()).toBe(withContact);
  });
});
