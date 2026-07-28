/**
 * D-23 spike v2 — deeper DOM inspection for Subito listing cards
 */
import { chromium } from 'playwright';

const URL = 'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  locale: 'it-IT',
});
await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(5000);

const info = await page.evaluate(() => {
  const articles = [...document.querySelectorAll('article')];
  const first = articles[0];
  const allLinks = [...document.querySelectorAll('a[href]')]
    .slice(0, 20)
    .map((a) => ({ href: a.getAttribute('href'), text: a.textContent?.trim()?.slice(0, 40) }));

  const articleLinks = first
    ? [...first.querySelectorAll('a[href]')].map((a) => ({
        href: a.getAttribute('href'),
        text: a.textContent?.trim()?.slice(0, 60),
      }))
    : [];

  return {
    articleCount: articles.length,
    firstArticleHtml: first?.outerHTML?.slice(0, 1500),
    firstArticleLinks: articleLinks,
    samplePageLinks: allLinks,
    dataTestIds: [...document.querySelectorAll('[data-testid]')]
      .slice(0, 15)
      .map((el) => el.getAttribute('data-testid')),
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
