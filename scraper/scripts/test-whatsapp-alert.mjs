#!/usr/bin/env node
/**
 * Verify CallMeBot WhatsApp alerting credentials by sending a test message.
 *
 * Usage (from repo root):
 *   cd scraper && node --import tsx scripts/test-whatsapp-alert.mjs
 *
 * Requires CALLMEBOT_PHONE and CALLMEBOT_APIKEY in scraper/.env or environment.
 */
import 'dotenv/config';

const phone = process.env.CALLMEBOT_PHONE?.trim();
const apikey = process.env.CALLMEBOT_APIKEY?.trim();

if (!phone || !apikey) {
  console.error('[test-whatsapp-alert] Missing CALLMEBOT_PHONE or CALLMEBOT_APIKEY.');
  console.error('Setup: https://www.callmebot.com/blog/free-api-whatsapp-messages/');
  process.exit(1);
}

const text = `[零元] WhatsApp alert test OK — ${new Date().toISOString()}`;
const url = new URL('https://api.callmebot.com/whatsapp.php');
url.searchParams.set('phone', phone);
url.searchParams.set('text', text);
url.searchParams.set('apikey', apikey);

console.log(`[test-whatsapp-alert] Sending test to ${phone.replace(/\d(?=\d{4})/g, '*')}…`);

const res = await fetch(url);
const body = await res.text();

if (!res.ok) {
  console.error(`[test-whatsapp-alert] HTTP ${res.status}: ${body}`);
  process.exit(1);
}

console.log(`[test-whatsapp-alert] Response: ${body.trim()}`);
console.log('[test-whatsapp-alert] Check WhatsApp — you should receive the test message within ~30s.');
