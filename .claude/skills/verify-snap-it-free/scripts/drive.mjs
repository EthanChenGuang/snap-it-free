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
mkdirSync(out, { recursive: true });

const PHONE = { width: 390, height: 844 };
const results = [];
function check(ok, label) {
  results.push({ ok: Boolean(ok), label });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
}

async function newPage(browser, viewport = PHONE, language = lang) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'en-US' });
  await context.addInitScript((value) => {
    if (!localStorage.getItem('shoumanwu_app_preferences')) {
      localStorage.setItem(
        'shoumanwu_app_preferences',
        JSON.stringify({ language: value, appearance: 'light', soundAlerts: false }),
      );
    }
  }, language);
  return { context, page: await context.newPage() };
}

async function shot(page, name) {
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`SHOT ${file}`);
}

async function settle(page, ms = 600) {
  await page.waitForTimeout(ms);
}

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

  const { context, page } = await newPage(browser);
  await page.goto(`${url}/?onboarding=1`, { waitUntil: 'networkidle' });
  await overlay(page).waitFor({ timeout: 15000 });
  await settle(page);
  check(await screenIs(page, 'welcome'), 'step 1 welcome shown with ?onboarding=1');
  check((await page.getByRole('button', { name: 'Skip' }).count()) === 1, 'Skip visible on step 1');
  await shot(page, '01-welcome');

  await page.getByRole('button', { name: 'Continue' }).click();
  await settle(page);
  check(await screenIs(page, 'how'), 'step 2 how-it-works after Continue');
  check((await page.getByRole('button', { name: 'Back' }).count()) === 1, 'Back visible from step 2');
  await shot(page, '02-how-it-works');

  await page.getByRole('button', { name: 'Continue' }).click();
  await settle(page);
  check(await screenIs(page, 'city'), 'step 3 city picker');
  check(await page.getByRole('button', { name: 'Continue' }).isDisabled(), 'Continue disabled until a city is picked');
  check((await page.getByRole('radio').count()) === 13, 'city picker lists the 13 supported cities');
  await shot(page, '03-city-picker');

  // Pick the city with the most active listings so the teaser shows real photos; record every count.
  const counts = [];
  let best = null;
  let zeroShot = false;
  for (const radio of await page.getByRole('radio').all()) {
    const name = (await radio.innerText()).trim();
    await radio.click();
    const teaser = page.getByTestId('onboarding-teaser');
    await teaser.waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-testid="onboarding-teaser"]')?.textContent?.includes('Counting'), null, { timeout: 30000 });
    const text = (await teaser.innerText()).trim();
    const match = text.match(/^([\d,]+) free listing/);
    const count = match ? Number(match[1].replaceAll(',', '')) : 0;
    counts.push(`${name}=${count}`);
    if (!best || count > best.count) best = { name, count };
    if (count === 0 && !zeroShot) {
      zeroShot = true;
      await shot(page, '04b-city-teaser-zero');
      check(/No free listings active/.test(text), `zero state is honest for ${name}`);
    }
  }
  console.log(`INFO teaser counts: ${counts.join(', ')}`);
  await page.getByRole('radio', { name: best.name }).click();
  await settle(page, 1500);
  const teaserText = (await page.getByTestId('onboarding-teaser').innerText()).trim();
  check(best.count > 0 && teaserText.includes(best.count.toLocaleString('en-US')), `teaser shows real count for ${best.name}: "${teaserText.split('\n')[0]}"`);
  const thumbs = await page.getByTestId('onboarding-teaser').locator('img').count();
  check(thumbs > 0 && thumbs <= 4, `teaser shows ${thumbs} real thumbnails`);
  await shot(page, '04-city-teaser');

  await page.getByRole('button', { name: 'Continue' }).click();
  await settle(page);
  check(await screenIs(page, 'alerts'), 'step 4 alerts');
  check((await page.getByRole('button', { name: 'Not now' }).count()) === 1, 'alerts step has a clear Not now');
  await shot(page, '05-alerts');

  await page.getByRole('button', { name: 'Turn on notifications' }).click();
  await page.getByRole('status').filter({ hasText: /account|support|blocked|iPhone|on\./ }).waitFor({ timeout: 10000 });
  const pushMessage = (await page.getByRole('status').filter({ hasText: /account|support|blocked|iPhone|on\./ }).innerText()).trim();
  check(pushMessage.length > 0, `enable push as a guest gives an honest result: "${pushMessage}"`);
  await shot(page, '06-alerts-result-guest');

  await page.getByRole('button', { name: 'Continue' }).click();
  await settle(page);
  check(await screenIs(page, 'paywall'), 'paywall after the alerts step');
  check(await page.getByTestId('paywall-close').isVisible(), 'close button visible immediately on the paywall');
  check((await page.getByText('Continue for free').count()) === 0, 'hard paywall: no "Continue for free" path');
  check((await page.getByRole('radio').count()) === 3, 'three plan cards');
  check((await page.getByTestId('paywall-plan-yearly').getAttribute('aria-checked')) === 'true', 'yearly preselected');
  check((await page.getByTestId('paywall-plan-yearly').innerText()).includes('Best value'), 'yearly highlighted as Best value');
  const renewal = (await page.getByTestId('paywall-renewal').innerText()).trim();
  check(renewal.startsWith('€19.99 per year. Renews automatically'), `price + auto-renewal near CTA: "${renewal}"`);
  check((await page.getByRole('link', { name: 'Terms' }).getAttribute('href')) === '/terms', 'Terms links to /terms');
  check((await page.getByRole('link', { name: 'Privacy' }).getAttribute('href')) === '/privacy', 'Privacy links to /privacy');
  await shot(page, '07-paywall');

  await page.getByTestId('paywall-plan-weekly').click();
  const weekly = (await page.getByTestId('paywall-renewal').innerText()).trim();
  check(weekly.startsWith('€1.99 per week.'), `renewal text follows the selected plan: "${weekly}"`);
  await page.getByRole('button', { name: 'Restore purchases' }).click();
  await page.getByText('Sign in first to restore').waitFor({ timeout: 10000 });
  check(true, 'Restore as a guest asks to sign in (GET /api/subscription → signedIn:false)');
  await shot(page, '08-paywall-weekly-restore');

  await page.getByTestId('paywall-cta').click();
  await settle(page);
  check((await page.getByText('Payments aren’t enabled yet').count()) === 1, 'CTA shows payments-not-enabled, no charge');
  await shot(page, '09-cta-coming-soon');

  await page.getByTestId('paywall-coming-soon-continue').click();
  await settle(page, 1000);
  check((await overlay(page).count()) === 0, 'overlay closed');
  check(!page.url().includes('onboarding='), `?onboarding stripped from URL (${page.url()})`);
  check(
    (await page.evaluate(() => localStorage.getItem('shoumanwu_onboarding_completed_v1'))) === '1',
    'completion stored under the versioned key',
  );
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('shoumanwu_filter_prefs') ?? '{}'));
  check(prefs.mode === 'city' && typeof prefs.city === 'string' && prefs.city !== 'all', `picked city persisted in filter prefs (${prefs.city})`);
  check(await page.getByTestId('locked-feed').isVisible(), 'non-subscriber lands on the locked feed');
  check((await page.locator('a[href^="/listing/"]').count()) === 0, 'locked feed renders no listing links');
  await shot(page, '10-locked-feed');

  await page.getByTestId('locked-see-plans').click();
  await page.getByTestId('paywall-dialog').waitFor();
  await settle(page);
  await shot(page, '11-locked-see-plans');
  await page.getByTestId('paywall-close').click();
  check((await page.getByTestId('paywall-dialog').count()) === 0, 'paywall dialog closes back to the locked feed');

  if (listingHref) {
    await page.goto(`${url}${listingHref}?onboarding=1`, { waitUntil: 'networkidle' });
    await settle(page);
    check(await page.getByTestId('locked-detail').isVisible(), `listing detail ${listingHref} is locked for a non-subscriber`);
    await shot(page, '12-locked-detail');
  } else {
    check(false, 'found a listing id for the locked-detail check');
  }
  await context.close();

  const zh = await newPage(browser, PHONE, 'zh');
  await zh.page.goto(`${url}/?onboarding=1`, { waitUntil: 'networkidle' });
  await overlay(zh.page).waitFor();
  await zh.page.getByRole('button', { name: '跳过' }).click();
  await settle(zh.page);
  check((await zh.page.getByText('零元 Plus').count()) === 1, 'paywall localised in zh');
  await shot(zh.page, '13-paywall-zh');
  await zh.context.close();
}

async function desktopPaywall(browser) {
  const { context, page } = await newPage(browser, { width: 1280, height: 800 });
  await page.goto(`${url}/?onboarding=1`, { waitUntil: 'networkidle' });
  await overlay(page).waitFor();
  await page.getByRole('button', { name: 'Skip' }).click();
  await settle(page);
  check(await screenIs(page, 'paywall'), 'desktop: Skip goes to the paywall');
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
  await page.getByRole('button', { name: 'Skip' }).click();
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
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: 'Rome' }).click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="onboarding-teaser"]')?.textContent?.includes('Counting'), null, { timeout: 30000 });
  const teaser = (await page.getByTestId('onboarding-teaser').innerText()).trim();
  check(/^[\d,]+ free listings active in Rome/.test(teaser), `flag on: city teaser shows a real count for a non-subscriber: "${teaser.split('\n')[0]}"`);
  await shot(page, '20-flag-on-city-teaser');
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
