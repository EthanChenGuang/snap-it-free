#!/usr/bin/env node
/**
 * Verify Telegram alerting credentials by sending a test message.
 *
 * Usage (from repo root):
 *   cd scraper && npm run test:telegram
 *
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in scraper/.env or environment.
 */
import 'dotenv/config';

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

if (!token || !chatId) {
  console.error('[test-telegram-alert] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.');
  console.error('Setup: create a bot via @BotFather, then get your chat_id from @userinfobot or @getidsbot.');
  process.exit(1);
}

const text = `[零元] Telegram alert test OK — ${new Date().toISOString()}`;

console.log('[test-telegram-alert] Sending test message…');

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: chatId, text }),
});

const data = await res.json();

if (!data.ok) {
  console.error('[test-telegram-alert] Failed:', data.description ?? JSON.stringify(data));
  process.exit(1);
}

console.log(`[test-telegram-alert] Sent successfully (message_id: ${data.result.message_id})`);
console.log('[test-telegram-alert] Check your Telegram chat now.');
