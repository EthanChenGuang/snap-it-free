import { chromium } from 'playwright';

const DETAIL = 'https://www.subito.it/arredamento-casalinghi/accessori-camera-da-letto-venezia-655558887.htm';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: 'it-IT' });
await page.goto(DETAIL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3000);

const info = await page.evaluate(() => {
  const scripts = [...document.querySelectorAll('script')].map((s) => s.textContent ?? '');
  let lat = null;
  let lng = null;
  for (const txt of scripts) {
    for (const pat of [
      /"latitude"\s*:\s*([\d.]+)/,
      /"longitude"\s*:\s*([\d.]+)/,
      /"lat"\s*:\s*([\d.]+)/,
      /"lng"\s*:\s*([\d.]+)/,
      /"geo"\s*:\s*\{\s*"lat"\s*:\s*([\d.]+)/,
    ]) {
      const m = txt.match(pat);
      if (m) {
        if (pat.source.includes('latitude')) lat = parseFloat(m[1]);
        else if (pat.source.includes('longitude')) lng = parseFloat(m[1]);
        else if (pat.source.includes('"lat"')) lat = parseFloat(m[1]);
        else if (pat.source.includes('"lng"')) lng = parseFloat(m[1]);
      }
    }
  }

  const desc =
    document.querySelector('[data-testid="description"]') ??
    document.querySelector('[class*="description"]') ??
    document.querySelector('p[class*="Description"]');
  const timeEl = document.querySelector('time[datetime]') ?? document.querySelector('time');
  const imgs = [...document.querySelectorAll('img[src*="images.subito"]')].map((i) => i.getAttribute('src'));

  return {
    title: document.querySelector('h1')?.textContent?.trim(),
    desc: desc?.textContent?.trim()?.slice(0, 200),
    postedAt: timeEl?.getAttribute('datetime') ?? timeEl?.textContent?.trim(),
    lat,
    lng,
    imgs: imgs.slice(0, 3),
    dataTestIds: [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid')),
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent?.slice(0, 500)),
  };
});

console.log(JSON.stringify(info, null, 2));

// Also check __NEXT_DATA__ or similar
const nextData = await page.evaluate(() => {
  const el = document.querySelector('#__NEXT_DATA__');
  if (!el) return null;
  try {
    const data = JSON.parse(el.textContent ?? '{}');
    return JSON.stringify(data).slice(0, 2000);
  } catch {
    return null;
  }
});
if (nextData) console.log('NEXT_DATA snippet:', nextData);

await browser.close();
