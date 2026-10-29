#!/usr/bin/env node
// Usage: node drive.mjs <journey> --url http://127.0.0.1:PORT --out DIR [--base URL] [--lang en|zh|it]
// Journeys: flag-off | onboarding | desktop-paywall | persist | compare
// Needs playwright-core resolvable via PLAYWRIGHT_CORE (default /tmp/verify-tools/node_modules/playwright-core).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? '/tmp/verify-tools/node_modules/playwright-core');

const args = process.argv.slice(2);
const journey = args[0];
const opt = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const url = opt('url');
const out = opt('out', '/tmp/verify-snap-it-free/evidence');
const lang = opt('lang', 'en');
// Optional: a Vercel deployment-protection share token (read from env only, never hardcoded/committed).
// When set, each fresh context first visits `${url}/?_vercel_share=<token>` to plant the bypass cookie.
const shareToken = process.env.VERCEL_SHARE_TOKEN || '';
mkdirSync(out, { recursive: true });

const PHONE = { width: 390, height: 844 };
const results = [];
function check(ok, label) {
  results.push({ ok: Boolean(ok), label });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
}

async function newPage(browser, viewport = PHONE, language = lang, { stubAuth = false } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'en-US' });
  await context.addInitScript((value) => {
    if (!localStorage.getItem('shoumanwu_app_preferences')) {
      localStorage.setItem(
        'shoumanwu_app_preferences',
        JSON.stringify({ language: value, appearance: 'light', soundAlerts: false }),
      );
    }
  }, language);
  // QA stub for the REQUIRED account step: honored only under ?onboarding=1, grants no real access
  // (the SSR paywall gate is independent). Never creates a real account or signs up remotely.
  if (stubAuth) {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('shoumanwu_onboarding_stub_auth', '1');
      } catch {}
    });
  }
  const page = await context.newPage();
  // Plant the Vercel protection-bypass cookie once per context, before the real navigations.
  if (shareToken && url) {
    await page
      .goto(`${url}/?_vercel_share=${encodeURIComponent(shareToken)}`, { waitUntil: 'domcontentloaded' })
      .catch(() => {});
  }
  return { context, page };
}

/** Walk the five value-prop steps to the personal preview. Picks `city` on the city step. */
async function walkToPreview(page, city = 'Milan') {
  await page.getByTestId('onboarding-continue').click(); // hook → how
  await settle(page, 400);
  await page.getByTestId('onboarding-continue').click(); // how → interests
  await settle(page, 400);
  await page.getByRole('checkbox', { name: 'Books' }).click();
  await page.getByTestId('onboarding-continue').click(); // interests → mobility
  await settle(page, 400);
  await page.getByRole('checkbox', { name: /Bike/ }).click();
  await page.getByTestId('onboarding-continue').click(); // mobility → city
  await settle(page, 400);
  await page.getByRole('radio', { name: city }).click();
  await page.getByTestId('onboarding-continue').click(); // city → preview
  await settle(page, 400);
  await page
    .waitForFunction(
      () => document.querySelector('[data-testid="preview-count"]') || document.querySelector('[data-testid="onboarding-preview"]')?.textContent?.includes('couldn'),
      null,
      { timeout: 30000 },
    )
    .catch(() => {});
}

async function shot(page, name) {
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`SHOT ${file}`);
}

async function settle(page, ms = 600) {
  await page.waitForTimeout(ms);
}

/** Is Stripe billing live on this deployment? GET /api/subscription reports the configured flag.
 * Local flag-off → false (payments disabled); Vercel Preview test mode → true. Defaults to off. */
async function stripeConfigured(page) {
  try {
    const res = await page.request.get(`${url}/api/subscription`);
    const body = await res.json();
    return body?.configured === true;
  } catch {
    return false;
  }
}

/** A valid-looking listing UUID. */
const isListingId = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const overlay = (page) => page.getByTestId('onboarding-overlay');
const screenIs = async (page, screen) =>
  (await overlay(page).getAttribute('data-screen', { timeout: 5000 }).catch(() => null)) === screen;

async function flagOff(browser) {
  const { context, page } = await newPage(browser);
  await page.goto(`${url}/`, { waitUntil: 'networkidle' });
  await settle(page, 2500);
  check((await overlay(page).count()) === 0, 'flag off: no onboarding overlay on /');
  check((await page.getByTestId('locked-feed').count()) === 0, 'flag off: feed is not locked');
  const cards = await page.locator('a[href^="/listing/"]').count();
  check(cards > 0, `flag off: real listing cards render (${cards} links)`);
  await shot(page, '00-flag-off');
  await page.goto(`${url}/terms`, { waitUntil: 'networkidle' });
  const freeTerms = await page.locator('main').innerText();
  check(!freeTerms.includes('Subscriptions') && !freeTerms.includes('Stripe'), 'flag off: Terms carry no subscription or Stripe text');
  await context.close();
}

async function onboarding(browser) {
  // A real listing id for the locked-detail check, read from the open feed first.
  const probe = await newPage(browser);
  await probe.page.goto(`${url}/`, { waitUntil: 'networkidle' });
  await settle(probe.page, 1500);
  const listingHref = await probe.page.locator('a[href^="/listing/"]').first().getAttribute('href').catch(() => null);
  await probe.context.close();

  const { context, page } = await newPage(browser, PHONE, lang, { stubAuth: true });

  // Fallback source of a REAL listing id for the locked-detail probe: the onboarding teaser reads
  // active rows straight from Supabase (listings_public), and those responses carry row ids even when
  // the paywalled feed renders no listing links (e.g. on the Preview). Capture the first valid id.
  const teaserIds = [];
  page.on('response', async (response) => {
    if (teaserIds.length) return;
    try {
      if (!response.url().includes('/rest/v1/listings_public') || response.request().method() !== 'GET') return;
      const body = await response.json();
      if (!Array.isArray(body)) return;
      for (const row of body) if (isListingId(row?.id)) teaserIds.push(row.id);
    } catch {
      /* head/count requests have no JSON body; ignore */
    }
  });

  await page.goto(`${url}/?onboarding=1`, { waitUntil: 'networkidle' });
  await overlay(page).waitFor({ timeout: 15000 });
  await settle(page);

  // 1 · Hook
  check(await screenIs(page, 'hook'), 'step 1 hook shown with ?onboarding=1');
  check((await page.getByRole('button', { name: 'Skip' }).count()) === 1, 'Skip visible on the hook');
  await shot(page, '01-hook');

  // 2 · How it works
  await page.getByTestId('onboarding-continue').click();
  await settle(page);
  check(await screenIs(page, 'how'), 'step 2 how-it-works after Continue');
  check((await page.getByRole('button', { name: 'Back' }).count()) === 1, 'Back visible from step 2');
  await shot(page, '02-how-it-works');

  // 3 · Interests (quiz, gated)
  await page.getByTestId('onboarding-continue').click();
  await settle(page);
  check(await screenIs(page, 'interests'), 'step 3 interests');
  check(await page.getByTestId('onboarding-continue').isDisabled(), 'Continue disabled until an interest is picked');
  await page.getByRole('checkbox', { name: 'Books' }).click();
  check(!(await page.getByTestId('onboarding-continue').isDisabled()), 'Continue enabled after an interest is picked');
  await shot(page, '03-interests');

  // 4 · Mobility (quiz, gated)
  await page.getByTestId('onboarding-continue').click();
  await settle(page);
  check(await screenIs(page, 'mobility'), 'step 4 mobility');
  await page.getByRole('checkbox', { name: /Bike/ }).click();
  await shot(page, '04-mobility');

  // 5 · City (Venice + Padova lead the list — P1-2 fix)
  await page.getByTestId('onboarding-continue').click();
  await settle(page);
  check(await screenIs(page, 'city'), 'step 5 city picker');
  check((await page.getByRole('radio').count()) === 13, 'city picker lists the 13 supported cities');
  const firstTwo = [
    (await page.getByRole('radio').nth(0).innerText()).trim(),
    (await page.getByRole('radio').nth(1).innerText()).trim(),
  ];
  check(firstTwo[0] === 'Venice' && firstTwo[1] === 'Padova', `P1-2: Venice + Padova lead the city list (${firstTwo.join(', ')})`);
  check(await page.getByTestId('onboarding-continue').isDisabled(), 'Continue disabled until a city is picked');
  await page.getByRole('radio', { name: 'Milan' }).click();
  await shot(page, '05-city');

  // 6 · Preview (real count + blurred real photos — the honest "N in your area" moment)
  await page.getByTestId('onboarding-continue').click();
  await settle(page);
  check(await screenIs(page, 'preview'), 'step 6 preview');
  await page.getByTestId('preview-count').waitFor({ timeout: 30000 }).catch(() => {});
  const previewText = (await page.getByTestId('onboarding-preview').innerText()).trim();
  check(/\d[\d,]* free items? in Milan/.test(previewText), `preview shows a real count for Milan: "${previewText.split('\n').find((l) => /Milan/.test(l)) ?? previewText.split('\n')[0]}"`);
  check((await page.getByTestId('preview-save').count()) === 1 && (await page.getByTestId('preview-see-plans').count()) === 1, 'preview offers Save my feed + See plans');
  await shot(page, '06-preview');

  // 7 · Account (REQUIRED — no "Not now"; QA stub stands in for a real session)
  await page.getByTestId('preview-save').click();
  await settle(page);
  check(await screenIs(page, 'account'), 'step 7 account');
  check((await page.getByRole('button', { name: 'Not now' }).count()) === 0, 'account step has no "Not now" (sign-up required)');
  check((await page.getByTestId('account-signed-in').count()) === 1, 'account step recognises the (stubbed) session');
  await shot(page, '07-account');

  // 8 · Alerts (after the account gate, with a labelled example)
  await page.getByTestId('account-continue').click();
  await settle(page);
  check(await screenIs(page, 'alerts'), 'step 8 alerts');
  check((await page.getByText('Example').count()) >= 1, 'alerts shows a clearly labelled Example notification');
  await shot(page, '08-alerts');
  await page.getByRole('button', { name: 'Turn on alerts' }).click();
  await page.getByRole('status').filter({ hasText: /account|support|blocked|iPhone|on\.|Settings/ }).waitFor({ timeout: 10000 });
  const pushMessage = (await page.getByRole('status').filter({ hasText: /account|support|blocked|iPhone|on\.|Settings/ }).innerText()).trim();
  check(pushMessage.length > 0, `enable alerts gives an honest result: "${pushMessage}"`);
  await shot(page, '08b-alerts-result');

  // 9 · Paywall (personalized, honest, closeable)
  await page.getByRole('button', { name: 'Not now' }).click();
  await settle(page);
  check(await screenIs(page, 'paywall'), 'step 9 paywall after the alerts step');
  check(await page.getByTestId('paywall-close').isVisible(), 'close button visible immediately on the paywall');
  check((await page.getByText('Continue for free').count()) === 0, 'hard paywall: no "Continue for free" path');
  check((await page.getByRole('radio').count()) === 3, 'three plan cards');
  check((await page.getByTestId('paywall-plan-yearly').getAttribute('aria-checked')) === 'true', 'yearly preselected');
  check((await page.getByTestId('paywall-plan-yearly').innerText()).includes('Best value'), 'yearly highlighted as Best value');
  const title = (await page.locator('#onboarding-title').innerText()).trim();
  check(/Unlock [\d,]+ free items? in Milan/.test(title), `paywall headline carries the real count + city: "${title}"`);
  const savings = (await page.getByTestId('paywall-savings').innerText()).trim();
  check(savings.includes('66'), `yearly savings tag is the true, floored figure: "${savings}"`);
  check((await page.getByTestId('paywall-billed').innerText()).includes('€19.99'), 'yearly billed line shows the full annual amount');
  const renewal = (await page.getByTestId('paywall-renewal').innerText()).trim();
  check(renewal.startsWith('€19.99 per year. Renews automatically'), `price + auto-renewal near CTA: "${renewal}"`);
  check((await page.getByRole('link', { name: 'Terms' }).getAttribute('href')) === '/terms', 'Terms links to /terms');
  check((await page.getByRole('link', { name: 'Privacy' }).getAttribute('href')) === '/privacy', 'Privacy links to /privacy');
  check(
    (await page.getByTestId('paywall-cta').innerText()).trim() === 'Unlock my feed',
    'paywall CTA reads "Unlock my feed"',
  );
  // All three plan cards (incl. the yearly savings tag) must be fully in view without scrolling.
  const cardsVisible = await page.evaluate(() => {
    const weekly = document.querySelector('[data-testid="paywall-plan-weekly"]');
    const scroller = weekly?.closest('.overflow-y-auto');
    const savings = document.querySelector('[data-testid="paywall-savings"]');
    if (!scroller || !savings || !weekly) return false;
    const box = scroller.getBoundingClientRect();
    const top = weekly.getBoundingClientRect().top;
    const bottom = savings.getBoundingClientRect().bottom;
    // Visible band of the scroll area, with a 1px tolerance.
    return top >= box.top - 1 && bottom <= box.bottom + 1 && scroller.scrollHeight <= scroller.clientHeight + 1;
  });
  check(cardsVisible, 'all three plan cards + the yearly savings tag fit without scrolling');
  await shot(page, '09-paywall');

  await page.getByTestId('paywall-plan-weekly').click();
  const weekly = (await page.getByTestId('paywall-renewal').innerText()).trim();
  check(weekly.startsWith('€1.99 per week.'), `renewal text follows the selected plan: "${weekly}"`);
  await page.getByRole('button', { name: 'Restore purchases' }).click();
  await page.getByText('Sign in first to restore').waitFor({ timeout: 10000 });
  check(true, 'Restore as a guest asks to sign in (GET /api/subscription → signedIn:false)');
  await shot(page, '09b-paywall-weekly-restore');

  // Stripe upstream failure, stubbed at the network edge: the route's 502 JSON must surface as a retryable error.
  await page.getByTestId('paywall-plan-yearly').click();
  await page.route('**/api/stripe/checkout', (route) =>
    route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'stripe_error' }) }),
  );
  await page.getByTestId('paywall-cta').click();
  await page.getByTestId('paywall-checkout-error').waitFor({ timeout: 10000 });
  check(
    (await page.getByTestId('paywall-checkout-error').innerText()).trim() === 'Couldn’t start checkout. Please try again.',
    'CTA on a Stripe 502 shows the checkout error',
  );
  check(await page.getByTestId('paywall-cta').isEnabled(), 'CTA stays enabled after the error so the user can retry');
  await shot(page, '09c-cta-stripe-error');
  await page.unroute('**/api/stripe/checkout');

  // CTA retry, now unstubbed. The honest outcome depends on whether Stripe billing is live on this
  // deployment. Payments OFF (local flag-off) → "Payments aren't enabled yet"; payments ON (Preview
  // test mode) + a guest → the sign-in-to-subscribe notice (checkout answers 401, no charge). Both
  // notices expose the same Continue button, so the walk proceeds either way. Never signs up.
  const paymentsOn = await stripeConfigured(page);
  await page.getByTestId('paywall-cta').click();
  if (paymentsOn) {
    await page.getByTestId('paywall-signInRequired').waitFor({ timeout: 10000 });
    check(
      (await page.getByText('Sign in to subscribe').count()) === 1,
      'payments on: CTA as a guest asks to sign in (checkout → 401), no charge',
    );
  } else {
    await page.getByTestId('paywall-comingSoon').waitFor({ timeout: 10000 });
    check(
      (await page.getByText('Payments aren’t enabled yet').count()) === 1,
      'payments off: CTA retry shows payments-not-enabled, no charge',
    );
  }
  await shot(page, '09d-cta-outcome');

  await page.getByTestId('paywall-coming-soon-continue').click();
  await settle(page, 1000);
  check((await overlay(page).count()) === 0, 'overlay closed');
  check(!page.url().includes('onboarding='), `?onboarding stripped from URL (${page.url()})`);
  check(
    (await page.evaluate(() => localStorage.getItem('shoumanwu_onboarding_completed_v2'))) === '1',
    'completion stored under the versioned key (v2)',
  );
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('shoumanwu_filter_prefs') ?? '{}'));
  check(prefs.city === 'milano', `picked city persisted in filter prefs (${prefs.city})`);
  check(Array.isArray(prefs.categories) && prefs.categories.includes('libri-riviste'), `interests persisted as real category slugs (${JSON.stringify(prefs.categories)})`);

  // 10 · The feed after the paywall, with the user's choices applied.
  // Honest outcome: the onboarding answers (city + interests) persist, yet a non-subscriber's feed
  // stays locked — closing the paywall never unlocks content.
  check(await page.getByTestId('locked-feed').isVisible(), 'step 10: non-subscriber lands on the locked feed');
  check((await page.locator('a[href^="/listing/"]').count()) === 0, 'locked feed renders no listing links');
  check(
    prefs.city === 'milano' && Array.isArray(prefs.categories) && prefs.categories.includes('libri-riviste'),
    'step 10: the user\'s city + interest choices are applied (persisted) on the post-paywall feed',
  );
  await shot(page, '10-locked-feed');

  await page.getByTestId('locked-see-plans').click();
  await page.getByTestId('paywall-dialog').waitFor();
  await settle(page);
  await shot(page, '11-locked-see-plans');
  await page.getByTestId('paywall-close').click();
  check((await page.getByTestId('paywall-dialog').count()) === 0, 'paywall dialog closes back to the locked feed');

  // Locked-detail probe. Prefer a listing link from `/` (present when the feed is open, e.g. local
  // flag-off). When the paywalled feed renders no links (e.g. the Preview), fall back to a real id
  // captured from the onboarding teaser's Supabase response. Only SKIP (never PASS) if no id exists.
  const detailId = (listingHref && listingHref.replace(/^\/listing\//, '').split(/[?#]/)[0]) || teaserIds[0] || null;
  if (isListingId(detailId)) {
    await page.goto(`${url}/listing/${detailId}?onboarding=1`, { waitUntil: 'networkidle' });
    await settle(page);
    check(await page.getByTestId('locked-detail').isVisible(), `listing detail /listing/${detailId} is locked for a non-subscriber`);
    await shot(page, '12-locked-detail');
  } else {
    console.log('SKIP locked-detail: no real listing id available (open feed has no links and the teaser returned none)');
  }
  await context.close();

  // zh walk to the paywall through the full flow (skip → preview → See plans).
  const zh = await newPage(browser, PHONE, 'zh', { stubAuth: true });
  await zh.page.goto(`${url}/?onboarding=1`, { waitUntil: 'networkidle' });
  await overlay(zh.page).waitFor();
  await zh.page.getByRole('button', { name: '跳过' }).click(); // skip → preview
  await settle(zh.page);
  await zh.page.getByTestId('preview-see-plans').click();
  await settle(zh.page);
  check(await screenIs(zh.page, 'paywall'), 'zh: See plans reaches the paywall');
  check((await zh.page.getByText('零元 Plus').count()) === 1, 'paywall brand localised in zh (零元 Plus)');
  check(
    (await zh.page.getByTestId('paywall-cta').innerText()).trim() === '解锁我的推荐',
    'zh: paywall CTA reads 解锁我的推荐',
  );
  await shot(zh.page, '13-paywall-zh');
  await zh.context.close();
}

async function desktopPaywall(browser) {
  const { context, page } = await newPage(browser, { width: 1280, height: 800 });
  await page.goto(`${url}/?onboarding=1`, { waitUntil: 'networkidle' });
  await overlay(page).waitFor();
  await page.getByRole('button', { name: 'Skip' }).click(); // skip → preview
  await settle(page);
  await page.getByTestId('preview-see-plans').click(); // preview → paywall
  await settle(page);
  check(await screenIs(page, 'paywall'), 'desktop: See plans reaches the paywall');
  const box = await overlay(page).locator(':scope > div').boundingBox();
  check(box && box.width <= 440, `desktop: paywall is a centered card (${Math.round(box?.width ?? 0)}px wide)`);
  await shot(page, '14-desktop-paywall');
  await context.close();
}

async function persist(browser) {
  const { context, page } = await newPage(browser);
  await page.goto(`${url}/`, { waitUntil: 'networkidle' });
  await overlay(page).waitFor({ timeout: 15000 });
  check(true, 'flag on: onboarding shows on / without any param');
  await shot(page, '15-flag-on-first-visit');
  // A guest completes onboarding without an account by taking Skip → preview → See plans → paywall → ✕.
  await page.getByRole('button', { name: 'Skip' }).click();
  await settle(page);
  await page.getByTestId('preview-see-plans').click();
  await settle(page);
  await page.getByTestId('paywall-close').click();
  await settle(page, 1000);
  await page.reload({ waitUntil: 'networkidle' });
  await settle(page, 2500);
  check((await overlay(page).count()) === 0, 'flag on: onboarding not shown again after completion + reload');
  check(await page.getByTestId('locked-feed').isVisible(), 'flag on: non-subscriber still sees the locked feed after reload');
  check((await page.locator('a[href^="/listing/"]').count()) === 0, 'flag on: no listing links for a non-subscriber');
  const html = await (await page.request.get(`${url}/`)).text();
  check(!/"external_url"/.test(html), 'flag on: server HTML carries no listing payload (no external_url)');
  await shot(page, '16-flag-on-after-reload-locked');
  await page.goto(`${url}/favorites`, { waitUntil: 'networkidle' });
  check(await page.getByTestId('locked-favorites').isVisible(), 'flag on: favorites locked');
  await shot(page, '17-flag-on-favorites-locked');

  await page.goto(`${url}/terms`, { waitUntil: 'networkidle' });
  const terms = await page.locator('main').innerText();
  check(
    ['€1.99 per week', '€4.99 per month', '€19.99 per year', 'renews automatically', 'Stripe Payments Europe', 'up to 3 days'].every((s) => terms.includes(s)),
    'flag on: Terms state prices, auto-renewal, Stripe as processor and the 3-day retry window',
  );
  await page.getByRole('heading', { name: 'Subscriptions' }).scrollIntoViewIfNeeded();
  await shot(page, '18-flag-on-terms-subscriptions');
  await page.goto(`${url}/privacy`, { waitUntil: 'networkidle' });
  const privacy = await page.locator('main').innerText();
  check(privacy.includes('We never see or store them') && privacy.includes('Stripe customer and subscription identifiers'), 'flag on: Privacy explains what Stripe handles and what we store');
  await page.getByRole('heading', { name: 'Payments and subscriptions' }).scrollIntoViewIfNeeded();
  await shot(page, '19-flag-on-privacy-payments');

  await page.goto(`${url}/?onboarding=1`, { waitUntil: 'networkidle' });
  await overlay(page).waitFor({ timeout: 15000 });
  await walkToPreview(page, 'Rome');
  const teaser = (await page.getByTestId('onboarding-preview').innerText()).trim();
  check(
    /\d[\d,]* free items? in Rome/.test(teaser),
    `flag on: preview shows a real count for a non-subscriber via the 044 RPC/rows fallback: "${teaser.split('\n').find((l) => /Rome/.test(l)) ?? teaser.split('\n')[0]}"`,
  );
  await shot(page, '20-flag-on-preview-count');
  await context.close();
}

// Same moment, same Supabase data: the home DOM on two builds must be identical once scripts are dropped.
async function compare(browser) {
  const base = opt('base');
  const snapshot = async (target) => {
    const { context, page } = await newPage(browser);
    await page.goto(`${target}/`, { waitUntil: 'networkidle' });
    await settle(page, 3000);
    const dom = await page.evaluate(() => {
      const body = document.body.cloneNode(true);
      body.querySelectorAll('script, link, style, next-route-announcer, template').forEach((node) => node.remove());
      return body.innerHTML.replace(/\s(nonce|data-precedence)="[^"]*"/g, '');
    });
    const png = path.join(out, `compare-${target.split(':').pop()}.png`);
    await page.screenshot({ path: png });
    await context.close();
    return { dom, png };
  };
  const [a, b] = await Promise.all([snapshot(base), snapshot(url)]);
  writeFileSync(path.join(out, 'compare-base.html'), a.dom);
  writeFileSync(path.join(out, 'compare-head.html'), b.dom);
  check(a.dom.length > 1000, `baseline DOM captured (${a.dom.length} chars)`);
  check(a.dom === b.dom, `flag off: home DOM identical to main (${a.dom.length} vs ${b.dom.length} chars)`);
}

const journeys = { 'flag-off': flagOff, onboarding, 'desktop-paywall': desktopPaywall, persist, compare };
if (!journeys[journey] || !url) {
  console.error('usage: node drive.mjs <flag-off|onboarding|desktop-paywall|persist|compare> --url URL [--out DIR] [--base URL]');
  process.exit(2);
}
const browser = await chromium.launch();
try {
  await journeys[journey](browser);
} catch (error) {
  check(false, `journey threw: ${error.message.split('\n')[0]}`);
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`RESULT ${journey}: ${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
