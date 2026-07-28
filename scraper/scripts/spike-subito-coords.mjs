import { chromium } from 'playwright';

// Try a Venice centro listing for map coords
const URLS = [
  'https://www.subito.it/arredamento-casalinghi/accessori-camera-da-letto-venezia-655558887.htm',
  'https://www.subito.it/annunci-veneto/regalo/elettrodomestici/',
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: 'it-IT' });

for (const url of URLS) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);
  const html = await page.content();
  const patterns = [
    /"latitude"\s*:\s*([\d.]+)/g,
    /"longitude"\s*:\s*([\d.]+)/g,
    /center:\s*\[([\d.]+),\s*([\d.]+)\]/g,
    /lat[=:]([\d.]+)/gi,
    /maps\.google[^"']*[?&]q=([\d.]+),([\d.]+)/g,
  ];
  console.log('\n===', url, '===');
  for (const p of patterns) {
    const matches = [...html.matchAll(p)].slice(0, 3);
    if (matches.length) console.log(p.source, matches.map((m) => m[0]));
  }
  const desc = await page.evaluate(() => {
    const ps = [...document.querySelectorAll('p')].map((p) => p.textContent?.trim()).filter((t) => t && t.length > 20 && t !== 'Descrizione');
    return ps.slice(0, 3);
  });
  console.log('description paragraphs:', desc);
}

await browser.close();
