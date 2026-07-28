/**
 * Ad-hoc D-23 spike — inspect live Subito category pages for selectors.
 * Run: node scripts/spike-subito.mjs
 */
import { chromium } from 'playwright';

const URLS = [
  'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/',
  'https://www.subito.it/annunci-veneto/regalo/elettrodomestici/',
  'https://www.subito.it/annunci-veneto/regalo/bambini-giocattoli/',
];

async function inspectPage(page, url) {
  console.log('\n===', url, '===');
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('status:', resp?.status());
  console.log('title:', await page.title());

  await page.waitForTimeout(3000);

  const blocked = (await page.title()).toLowerCase().includes('blocked');
  if (blocked) {
    console.log('BLOCKED page detected');
    return { url, blocked: true };
  }

  const cardSelectors = [
    'article[data-testid="listing-card"]',
    '[data-testid="listing-card"]',
    'article[class*="ItemCard"]',
    'div[class*="ItemCard"]',
    'a[href*="/annuncio/"]',
    'article',
  ];

  for (const sel of cardSelectors) {
    const count = await page.locator(sel).count();
    if (count > 0) console.log(`cards via "${sel}": ${count}`);
  }

  const firstLink = page.locator('a[href*="/annuncio/"]').first();
  const href = await firstLink.getAttribute('href').catch(() => null);
  console.log('first listing href:', href);

  const sample = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/annuncio/"]');
    if (!link) return null;
    const card = link.closest('article') ?? link.closest('div[class*="card"]') ?? link.parentElement;
    const img = card?.querySelector('img');
    const titleEl =
      card?.querySelector('h2') ??
      card?.querySelector('h3') ??
      card?.querySelector('[class*="title"]') ??
      link;
    return {
      cardTag: card?.tagName,
      cardClass: card?.className?.slice?.(0, 120),
      linkHref: link.getAttribute('href'),
      title: titleEl?.textContent?.trim()?.slice(0, 80),
      imgSrc: img?.getAttribute('src') ?? img?.getAttribute('data-src'),
      imgAlt: img?.getAttribute('alt'),
    };
  });
  console.log('sample card:', JSON.stringify(sample, null, 2));

  const pagination = await page.evaluate(() => {
    const nextBtn = document.querySelector('a[rel="next"], button[aria-label*="successiv"], a[class*="pagination"]');
    const loadMore = document.querySelector('button[class*="load"], button[class*="Load"]');
    return {
      nextHref: nextBtn?.getAttribute?.('href') ?? null,
      loadMoreText: loadMore?.textContent?.trim() ?? null,
      hasQueryPagination: !!document.querySelector('a[href*="?o="]'),
    };
  });
  console.log('pagination:', pagination);

  if (href) {
    const detailUrl = href.startsWith('http') ? href : `https://www.subito.it${href}`;
    console.log('\n--- detail page ---', detailUrl);
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    console.log('detail title:', await page.title());

    const detail = await page.evaluate(() => {
      const desc =
        document.querySelector('[data-testid="description"]') ??
        document.querySelector('[class*="description"]') ??
        document.querySelector('p[class*="Description"]');
      const timeEl =
        document.querySelector('time') ??
        document.querySelector('[datetime]') ??
        document.querySelector('[class*="date"]');
      const scripts = [...document.querySelectorAll('script')].map((s) => s.textContent ?? '');
      let lat = null;
      let lng = null;
      for (const txt of scripts) {
        const latM = txt.match(/"latitude"\s*:\s*([\d.]+)/);
        const lngM = txt.match(/"longitude"\s*:\s*([\d.]+)/);
        if (latM && lngM) {
          lat = parseFloat(latM[1]);
          lng = parseFloat(lngM[1]);
          break;
        }
        const coordM = txt.match(/"lat"\s*:\s*([\d.]+).*?"lng"\s*:\s*([\d.]+)/s);
        if (coordM) {
          lat = parseFloat(coordM[1]);
          lng = parseFloat(coordM[2]);
          break;
        }
      }
      const iframe = document.querySelector('iframe[src*="maps"]');
      return {
        descSnippet: desc?.textContent?.trim()?.slice(0, 120),
        postedAt: timeEl?.getAttribute('datetime') ?? timeEl?.textContent?.trim(),
        lat,
        lng,
        mapIframe: iframe?.getAttribute('src')?.slice(0, 100),
        h1: document.querySelector('h1')?.textContent?.trim()?.slice(0, 80),
      };
    });
    console.log('detail fields:', JSON.stringify(detail, null, 2));
    return { url, blocked: false, sample, pagination, detail, detailUrl };
  }

  return { url, blocked: false, sample, pagination };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  locale: 'it-IT',
});
const page = await context.newPage();
const results = [];
for (const url of URLS) {
  try {
    results.push(await inspectPage(page, url));
  } catch (err) {
    console.error('error on', url, err.message);
    results.push({ url, error: err.message });
  }
}
await browser.close();
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(results, null, 2));
