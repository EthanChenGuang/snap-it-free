#!/usr/bin/env node
/**
 * Phase 16 proxy matrix spike — same Subito category URLs with direct or proxy egress.
 *
 * Usage:
 *   node scraper/scripts/spike-subito-proxy-matrix.mjs --direct --label direct --out /tmp/spike-direct.md
 *   node scraper/scripts/spike-subito-proxy-matrix.mjs --proxy-url "$SCRAPER_PROXY_URL" --label webshare --out /tmp/spike-webshare.md
 *   SCRAPER_PROXY_URL=... node scraper/scripts/spike-subito-proxy-matrix.mjs --label decodo --out /tmp/spike-decodo.md
 *
 * Flags:
 *   --direct          Force direct fetch (ignore SCRAPER_PROXY_URL / HTTP_PROXY)
 *   --proxy-url URL   Override proxy URL (falls back to SCRAPER_PROXY_URL / HTTP_PROXY)
 *   --label NAME      Artifact label (e.g. direct | webshare | decodo)
 *   --out PATH        Write markdown artifact to PATH (default: stdout only)
 *
 * Rate-limit friendly: 2s delay between URLs. Credentials masked in artifact (host only).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gotScraping } from 'got-scraping';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** Same matrix as spike-subito-http-category.mjs (includes Venezia arredamento-casalinghi) */
const TARGET_URLS = [
  {
    label: 'Venezia arredamento-casalinghi',
    url: 'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
  },
  {
    label: 'Padova arredamento-casalinghi',
    url: 'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/padova/padova/',
  },
  {
    label: 'Veneto elettrodomestici (high volume)',
    url: 'https://www.subito.it/annunci-veneto/regalo/elettrodomestici/',
  },
  {
    label: 'Venezia informatica',
    url: 'https://www.subito.it/annunci-veneto/regalo/informatica/venezia/venezia/',
  },
  {
    label: 'Padova arredamento giardino',
    url: 'https://www.subito.it/annunci-veneto/regalo/arredamento-giardino/padova/padova/',
  },
];

const TLS_OPTIONS = {
  browsers: [{ name: 'chrome', minVersion: 120 }],
  devices: ['desktop'],
  locales: ['it-IT'],
};

const DELAY_MS = 2000;

function parseArgs(argv) {
  const opts = {
    direct: false,
    proxyUrl: null,
    label: 'unknown',
    out: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--direct') {
      opts.direct = true;
    } else if (arg === '--proxy-url') {
      opts.proxyUrl = argv[++i];
    } else if (arg === '--label') {
      opts.label = argv[++i] ?? 'unknown';
    } else if (arg === '--out') {
      opts.out = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scraper/scripts/spike-subito-proxy-matrix.mjs [options]

Options:
  --direct              Force direct fetch (no proxy)
  --proxy-url URL       Proxy URL (default: SCRAPER_PROXY_URL or HTTP_PROXY)
  --label NAME          Run label for artifact (default: unknown)
  --out PATH            Write markdown artifact to PATH
  --help                Show this help
`);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  return opts;
}

function maskProxyUrl(proxyUrl) {
  if (!proxyUrl) return '[none — direct]';
  try {
    const u = new URL(proxyUrl);
    return `${u.protocol}//${u.hostname}:${u.port || '****'} (credentials masked)`;
  } catch {
    return '[proxy — masked]';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUrl(label, url, proxyUrl) {
  const row = {
    label,
    url,
    status: 0,
    wallMs: 0,
    blocked: false,
    error: null,
  };

  const requestOptions = {
    url,
    headerGeneratorOptions: TLS_OPTIONS,
    timeout: { request: 15000 },
  };
  if (proxyUrl) {
    requestOptions.proxyUrl = proxyUrl;
  }

  const t0 = performance.now();
  try {
    const res = await gotScraping(requestOptions);
    row.wallMs = Math.round(performance.now() - t0);
    row.status = res.statusCode ?? 0;
    const html = typeof res.body === 'string' ? res.body : res.body.toString();
    row.blocked =
      row.status === 403 ||
      /blocked|captcha|access denied/i.test(html.slice(0, 5000)) ||
      /blocked/i.test(res.headers?.['x-subito-block'] ?? '');
    return row;
  } catch (err) {
    row.wallMs = Math.round(performance.now() - t0);
    row.error = err instanceof Error ? err.message : String(err);
    row.blocked = true;
    return row;
  }
}

function renderMarkdown({ label, proxyMasked, results }) {
  const blockedCount = results.filter((r) => r.blocked).length;
  const okCount = results.filter((r) => r.status === 200 && !r.blocked).length;
  const verdict = blockedCount === 0 && okCount === results.length ? 'PASS' : 'PARTIAL/FAIL';

  return `# Subito Proxy Matrix Spike (${label})

**Date:** ${new Date().toISOString()}
**Label:** ${label}
**Overall verdict:** ${verdict}
**Proxy:** ${proxyMasked}

## URL matrix

| Label | Status | Wall ms | Blocked | Error |
|-------|--------|---------|---------|-------|
${results
  .map(
    (r) =>
      `| ${r.label} | ${r.status} | ${r.wallMs} | ${r.blocked ? 'yes' : 'no'} | ${r.error ?? '—'} |`,
  )
  .join('\n')}

## Summary

- URLs tested: ${results.length}
- 200 OK unblocked: ${okCount}/${results.length}
- Blocked or error: ${blockedCount}/${results.length}

---
*Generated by scraper/scripts/spike-subito-proxy-matrix.mjs*
`;
}

async function main() {
  const opts = parseArgs(process.argv);

  let proxyUrl = null;
  if (!opts.direct) {
    proxyUrl =
      opts.proxyUrl ??
      process.env.SCRAPER_PROXY_URL ??
      process.env.HTTP_PROXY ??
      null;
  }

  const proxyMasked = opts.direct ? '[none — --direct]' : maskProxyUrl(proxyUrl);

  console.log(`=== Subito proxy matrix spike (${opts.label}) ===`);
  console.log(`Proxy: ${proxyMasked}`);

  const results = [];
  for (let i = 0; i < TARGET_URLS.length; i += 1) {
    const target = TARGET_URLS[i];
    if (i > 0) {
      await sleep(DELAY_MS);
    }
    console.log(`Fetching: ${target.label}`);
    const row = await fetchUrl(target.label, target.url, proxyUrl);
    results.push(row);
    console.log(
      `  status=${row.status} wallMs=${row.wallMs} blocked=${row.blocked}${row.error ? ` err=${row.error}` : ''}`,
    );
  }

  const md = renderMarkdown({ label: opts.label, proxyMasked, results });

  if (opts.out) {
    mkdirSync(dirname(opts.out), { recursive: true });
    writeFileSync(opts.out, md, 'utf-8');
    console.log(`Wrote ${opts.out}`);
  } else {
    console.log('\n--- artifact ---\n');
    console.log(md);
  }

  const allOk = results.every((r) => r.status === 200 && !r.blocked);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
