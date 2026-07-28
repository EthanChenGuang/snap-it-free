import { chromium } from 'playwright';

const DETAIL = 'https://www.subito.it/arredamento-casalinghi/accessori-camera-da-letto-venezia-655558887.htm';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'it-IT' });
const page = await context.newPage();
await page.goto(DETAIL, { waitUntil: 'domcontentloaded', timeout: 90000 });

// Accept cookies if present
const acceptBtn = page.locator('button:has-text("Accetta"), button:has-text("Accept"), #didomi-notice-agree-button');
if (await acceptBtn.count()) {
  await acceptBtn.first().click().catch(() => {});
  await page.waitForTimeout(1000);
}

await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(3000);

const html = await page.content();
const coordMatches = [
  ...html.matchAll(/"(?:latitude|lat)"\s*:\s*([\d.]+)/g),
  ...html.matchAll(/"(?:longitude|lng|lon)"\s*:\s*([\d.]+)/g),
];
console.log('coord matches sample:', coordMatches.slice(0, 10).map((m) => m[0]));

const info = await page.evaluate(() => {
  const body = document.body.innerText.slice(0, 3000);
  const locationSection = [...document.querySelectorAll('*')]
    .filter((el) => el.textContent?.includes('Venezia') && el.children.length < 5)
    .slice(0, 5)
    .map((el) => ({ tag: el.tagName, class: el.className?.slice?.(0, 80), text: el.textContent?.trim()?.slice(0, 100) }));

  const descCandidates = [
    '[data-testid="description"]',
    '[class*="Description"]',
    '[class*="description"]',
    'section[class*="description"] p',
    '.AdDescription-module_description__',
  ].map((sel) => {
    const el = document.querySelector(sel);
    return { sel, text: el?.textContent?.trim()?.slice(0, 150) ?? null };
  });

  const imgs = [...document.querySelectorAll('img')]
    .filter((i) => {
      const src = i.getAttribute('src') ?? '';
      return src.includes('images') || src.includes('sbt-ads');
    })
    .map((i) => i.getAttribute('src'))
    .slice(0, 5);

  const timeEls = [...document.querySelectorAll('time, [class*="date"], [class*="Date"]')].map((el) => ({
    tag: el.tagName,
    datetime: el.getAttribute('datetime'),
    text: el.textContent?.trim(),
    class: el.className?.slice?.(0, 60),
  }));

  const iframe = document.querySelector('iframe[src*="maps.google"]');

  return { locationSection, descCandidates, imgs, timeEls, mapIframe: iframe?.getAttribute('src'), bodySnippet: body.slice(0, 800) };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
