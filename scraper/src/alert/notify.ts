import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../config.js';

export type AlertPayload = {
  runId: string;
  startedAt: Date;
  parsedCount: number;
  minCount: number;
  medianCount: number;
  selectorPct: number;
  failureCode: string;
  failureDetail: string;
};

const TELEGRAM_MAX_LENGTH = 4096;
const TELEGRAM_DETAIL_TRUNCATE = 500;
const WHATSAPP_MAX_LENGTH = 1000;
const WHATSAPP_DETAIL_TRUNCATE = 300;

function buildEmailSubject(runId: string): string {
  return `[ALERT] 零元 scraper soft-block — run ${runId} failed validation`;
}

function buildEmailBody(payload: AlertPayload): string {
  return [
    'The Subito.it scraper detected a soft-block or suspiciously small feed and did NOT persist this batch.',
    '',
    `Run ID: ${payload.runId}`,
    `Started: ${payload.startedAt.toISOString()}`,
    `Listings parsed: ${payload.parsedCount} (threshold: ≥${payload.minCount}, 50% of 7-run median ${payload.medianCount})`,
    `Selector completeness: ${payload.selectorPct}% (threshold: ≥90%)`,
    `Failure reason: ${payload.failureCode} — ${payload.failureDetail}`,
    '',
    'Recommended actions:',
    '1. Check worker logs for HTTP/proxy errors',
    `2. Review scrape_runs row: ${payload.runId}`,
    '3. If Subito DOM changed, update extract/ selectors (D-05)',
    '4. If blocked, see legal/ops note and fallback plan (D-22)',
    '',
    '— 零元 (ZeroDollar / ZeroEuro) ingestion worker',
  ].join('\n');
}

function buildWhatsAppMessage(payload: AlertPayload): string {
  let failureDetail = payload.failureDetail;
  const base = [
    `⚠️ Subito scraper blocked — run ${payload.runId}`,
    `Parsed ${payload.parsedCount} listings (need ≥${payload.minCount}). Selectors ${payload.selectorPct}%.`,
    `Reason: ${payload.failureCode}`,
    failureDetail ? `Detail: ${failureDetail}` : null,
    '→ Check logs & scrape_runs',
  ]
    .filter(Boolean)
    .join('\n');

  if (base.length <= WHATSAPP_MAX_LENGTH) {
    return base;
  }

  failureDetail =
    failureDetail.length > WHATSAPP_DETAIL_TRUNCATE
      ? `${failureDetail.slice(0, WHATSAPP_DETAIL_TRUNCATE)}…(truncated)`
      : failureDetail;

  return [
    `⚠️ Subito scraper blocked — run ${payload.runId}`,
    `Parsed ${payload.parsedCount} listings (need ≥${payload.minCount}). Selectors ${payload.selectorPct}%.`,
    `Reason: ${payload.failureCode}`,
    failureDetail ? `Detail: ${failureDetail}` : null,
    '→ Check logs & scrape_runs',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, WHATSAPP_MAX_LENGTH);
}

function buildTelegramMessage(payload: AlertPayload): string {
  let failureDetail = payload.failureDetail;
  const base = [
    `⚠️ Scraper soft-block — run ${payload.runId}`,
    `Parsed ${payload.parsedCount} listings (need ≥${payload.minCount}). Selectors ${payload.selectorPct}%.`,
    `Reason: ${payload.failureCode}`,
    failureDetail ? `Detail: ${failureDetail}` : null,
    '→ Check logs & scrape_runs',
  ]
    .filter(Boolean)
    .join('\n');

  if (base.length <= TELEGRAM_MAX_LENGTH) {
    return base;
  }

  failureDetail =
    failureDetail.length > TELEGRAM_DETAIL_TRUNCATE
      ? `${failureDetail.slice(0, TELEGRAM_DETAIL_TRUNCATE)}…(truncated)`
      : failureDetail;

  return [
    `⚠️ Scraper soft-block — run ${payload.runId}`,
    `Parsed ${payload.parsedCount} listings (need ≥${payload.minCount}). Selectors ${payload.selectorPct}%.`,
    `Reason: ${payload.failureCode}`,
    failureDetail ? `Detail: ${failureDetail}` : null,
    '→ Check logs & scrape_runs',
  ]
    .filter(Boolean)
    .join('\n');
}

type AlertRouting = {
  telegramChatId: string | null;
  alertEmail: string | null;
};

async function loadAlertRouting(supabase: SupabaseClient): Promise<AlertRouting> {
  const { data, error } = await supabase
    .from('scraper_global_config')
    .select('telegram_chat_id, alert_email')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    telegramChatId: (data?.telegram_chat_id as string | null) ?? null,
    alertEmail: (data?.alert_email as string | null) ?? null,
  };
}

function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.CALLMEBOT_PHONE && process.env.CALLMEBOT_APIKEY);
}

function resolveChannel(routing?: AlertRouting): 'whatsapp' | 'telegram' | 'resend' | null {
  if (isWhatsAppConfigured()) {
    return 'whatsapp';
  }
  const chatId = routing?.telegramChatId ?? process.env.TELEGRAM_CHAT_ID;
  if (process.env.TELEGRAM_BOT_TOKEN && chatId) {
    return 'telegram';
  }
  const alertTo = routing?.alertEmail ?? process.env.ALERT_TO;
  if (process.env.RESEND_API_KEY && process.env.ALERT_FROM && alertTo) {
    return 'resend';
  }
  return null;
}

async function sendResendEmail(payload: AlertPayload, alertTo: string): Promise<void> {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.ALERT_FROM!,
    to: alertTo,
    subject: buildEmailSubject(payload.runId),
    text: buildEmailBody(payload),
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function sendTelegramMessage(payload: AlertPayload, chatId: string): Promise<void> {
  const TelegramBot = (await import('node-telegram-bot-api')).default;
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
  await bot.sendMessage(chatId, buildTelegramMessage(payload));
}

async function sendWhatsAppMessage(payload: AlertPayload): Promise<void> {
  const phone = process.env.CALLMEBOT_PHONE!;
  const apikey = process.env.CALLMEBOT_APIKEY!;
  const message = buildWhatsAppMessage(payload);
  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', phone);
  url.searchParams.set('text', message);
  url.searchParams.set('apikey', apikey);

  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`CallMeBot HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  if (/error|fail/i.test(body) && !/success|sent|queued/i.test(body)) {
    throw new Error(`CallMeBot rejected: ${body.slice(0, 200)}`);
  }
}

export async function notifyOperator(
  supabase: SupabaseClient,
  payload: AlertPayload,
  options: { emailOnly?: boolean } = {},
): Promise<void> {
  const routing = await loadAlertRouting(supabase);
  let channel = resolveChannel(routing);

  if (options.emailOnly) {
    const alertTo = routing.alertEmail ?? process.env.ALERT_TO;
    if (process.env.RESEND_API_KEY && process.env.ALERT_FROM && alertTo) {
      channel = 'resend';
    } else {
      console.error(
        `ALERT_DELIVERY_FAILED channel=email-only run_id=${payload.runId} error=No email alerting credentials configured`,
      );
      return;
    }
  }

  if (!channel) {
    console.error(
      `ALERT_DELIVERY_FAILED channel=none run_id=${payload.runId} error=No alerting credentials configured`,
    );
    return;
  }

  try {
    if (channel === 'whatsapp') {
      await sendWhatsAppMessage(payload);
    } else if (channel === 'telegram') {
      const chatId = routing.telegramChatId ?? process.env.TELEGRAM_CHAT_ID!;
      await sendTelegramMessage(payload, chatId);
    } else {
      const alertTo = routing.alertEmail ?? process.env.ALERT_TO!;
      await sendResendEmail(payload, alertTo);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`ALERT_DELIVERY_FAILED channel=${channel} run_id=${payload.runId} error=${message}`);
  }
}

export {
  buildEmailSubject,
  buildEmailBody,
  buildWhatsAppMessage,
  buildTelegramMessage,
  isWhatsAppConfigured,
  loadAlertRouting,
  resolveChannel,
};
