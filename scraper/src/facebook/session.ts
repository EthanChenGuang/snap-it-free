/**
 * Facebook session probe helpers (D-18-09/12).
 *
 * Wave 0 spike uses Playwright navigation; unit tests classify final URLs without network.
 */

import { readFileSync } from 'node:fs';
import type { BrowserContext, Page } from 'playwright';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  decryptSession,
  type EncryptedSessionPayload,
} from '../../../lib/admin/crypto.js';
import { ProxyConfiguration, PlaywrightCrawler } from 'crawlee';

export type SessionProbeResult = 'valid' | 'session_expired';

export function classifySessionProbeUrl(finalUrl: string): SessionProbeResult {
  if (!finalUrl) return 'session_expired';
  if (/\/login\/?(\?|$)/i.test(finalUrl)) return 'session_expired';
  if (/facebook\.com\/login/i.test(finalUrl)) return 'session_expired';
  if (/\/checkpoint\/?(\?|$)/i.test(finalUrl)) return 'session_expired';
  return 'valid';
}

export type SessionCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

export type SessionPayload = {
  cookies: SessionCookie[];
};

/** Returns false when c_user auth cookie is absent (D-18-12). */
export function hasAuthCookie(cookies: SessionCookie[]): boolean {
  return cookies.some((c) => c.name === 'c_user' && Boolean(c.value));
}

export function probeSessionFromNavigation(
  finalUrl: string,
  cookies: SessionCookie[],
): SessionProbeResult {
  if (!hasAuthCookie(cookies)) return 'session_expired';
  return classifySessionProbeUrl(finalUrl);
}

function parseSessionJson(raw: string): SessionPayload {
  const parsed = JSON.parse(raw) as unknown;
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as SessionPayload).cookies)) {
    return parsed as SessionPayload;
  }
  if (Array.isArray(parsed)) {
    return { cookies: parsed as SessionCookie[] };
  }
  throw new Error('invalid_session_format');
}

/** Load operator session from session_enc or FB_SESSION_JSON (local dev). */
export async function loadFacebookSession(
  supabase: SupabaseClient,
  slug: string,
): Promise<SessionPayload> {
  const { data, error } = await supabase
    .from('scraper_sources')
    .select('session_enc')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;

  if (data?.session_enc) {
    const secretsKey = process.env.SCRAPER_SECRETS_KEY?.trim();
    if (!secretsKey) throw new Error('SCRAPER_SECRETS_KEY not configured');
    const plaintext = decryptSession(data.session_enc as EncryptedSessionPayload, secretsKey);
    return parseSessionJson(plaintext);
  }

  const sessionPath = process.env.FB_SESSION_JSON?.trim();
  if (sessionPath) {
    const raw = readFileSync(sessionPath, 'utf-8');
    return parseSessionJson(raw);
  }

  throw new Error('session_missing');
}

/** Inject operator cookies into Playwright context before crawl (D-18-06). */
export async function applySessionToContext(
  context: BrowserContext,
  session: SessionPayload,
): Promise<void> {
  if (!hasAuthCookie(session.cookies)) {
    throw new Error('session_expired');
  }
  await context.addCookies(session.cookies);
}

const PROBE_URL =
  'https://www.facebook.com/marketplace/venice/search/?query=gratis&sortBy=creation_time_descend';

/**
 * Pre-flight session probe — navigates one marketplace URL and detects login wall (D-18-09).
 * Never logs cookie values (T-18-Crypto).
 */
export async function probeFacebookSession(
  session: SessionPayload,
  proxyUrl: string,
): Promise<SessionProbeResult> {
  if (!hasAuthCookie(session.cookies)) {
    return 'session_expired';
  }

  const proxyConfiguration = new ProxyConfiguration({ proxyUrls: [proxyUrl] });
  let probeResult: SessionProbeResult = 'session_expired';

  const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    minConcurrency: 1,
    maxConcurrency: 1,
    maxRequestsPerCrawl: 1,
    launchContext: { launchOptions: { headless: true } },
    async requestHandler({ page, request }) {
      await applySessionToContext(page.context(), session);
      await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      probeResult = probeSessionFromNavigation(page.url(), session.cookies);
    },
  });

  await crawler.run([PROBE_URL]);
  return probeResult;
}

/** Classify probe result — throws session_expired for worker gate. */
export function assertFacebookSessionValid(result: SessionProbeResult): void {
  if (result !== 'valid') {
    throw new Error('session_expired');
  }
}

export async function probeFacebookSessionOrThrow(
  session: SessionPayload,
  proxyUrl: string,
): Promise<void> {
  const result = await probeFacebookSession(session, proxyUrl);
  assertFacebookSessionValid(result);
}
