import { chromium } from 'playwright';

const URL = 'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: 'it-IT' });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3000);

const cards = await page.evaluate(() => {
  return [...document.querySelectorAll('article')].slice(0, 3).map((article) => {
    const link = article.querySelector('a[href*=".htm"]');
    const href = link?.getAttribute('href') ?? '';
    const idMatch = href.match(/-(\d+)\.htm/);
    const img = article.querySelector('img[src*="sbito"], img[src*="images"]');
    const placeholder = article.querySelector('img[src*="static/icons"]');
    return {
      href,
      external_id: idMatch?.[1] ?? null,
      title: article.querySelector('h3')?.textContent?.trim(),
      photo: img?.getAttribute('src') ?? placeholder?.getAttribute('src'),
      isPlaceholder: !!placeholder && !img,
      date: article.querySelector('[class*="insertion-date"], [class*="date"], span.caption')?.textContent?.trim(),
      location: article.querySelector('[class*="town"], [class*="location"], span.book')?.textContent?.trim(),
    };
  });
});

const pagination = await page.evaluate(() => {
  const nav = document.querySelector('nav[aria-label*="pagin"], [class*="pagination"]');
  const links = nav ? [...nav.querySelectorAll('a')] : [...document.querySelectorAll('a[href*="regalo"]')].filter((a) => a.textContent?.match(/^\d+$/));
  return {
    navHtml: nav?.outerHTML?.slice(0, 800),
    pageLinks: links.slice(0, 8).map((a) => ({ href: a.getAttribute('href'), text: a.textContent?.trim() })),
    scrollHeight: document.body.scrollHeight,
  };
});

console.log('cards:', JSON.stringify(cards, null, 2));
console.log('pagination:', JSON.stringify(pagination, null, 2));

// Check map on detail with longer wait
const detailUrl = cards[0]?.href;
if (detailUrl) {
  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(5000);
  const mapInfo = await page.evaluate(() => {
    const mapEl = document.querySelector('[class*="map"], [data-testid*="map"], iframe[src*="maps"]');
    const scripts = document.documentElement.innerHTML;
    const latLng = scripts.match(/(\d{2}\.\d{4,})[,;\s]+(\d{1,2}\.\d{4,})/g)?.slice(0, 5);
    return {
      mapClass: mapEl?.className,
      mapTag: mapEl?.tagName,
      latLngCandidates: latLng,
      locationText: document.querySelector('[class*="location"], [class*="Location"]')?.textContent?.trim()?.slice(0, 80),
      description: [...document.querySelectorAll('p, div')]
        .find((el) => el.textContent?.includes('Doghe') || el.textContent?.length > 50 && el.closest('[class*="description"]'))
        ?.textContent?.trim()?.slice(0, 200),
    };
  });
  console.log('detail map:', JSON.stringify(mapInfo, null, 2));
}

await browser.close();
