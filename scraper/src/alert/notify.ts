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
const WECHAT_MAX_LENGTH = 2000;
const WECHAT_DETAIL_TRUNCATE = 400;

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

function buildWeChatMessage(payload: AlertPayload): string {
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

  if (base.length <= WECHAT_MAX_LENGTH) {
    return base;
  }

  failureDetail =
    failureDetail.length > WECHAT_DETAIL_TRUNCATE
      ? `${failureDetail.slice(0, WECHAT_DETAIL_TRUNCATE)}…(truncated)`
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
    .slice(0, WECHAT_MAX_LENGTH);
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

function resolvePushPlusChannel(): string {
  const channel = process.env.PUSHPLUS_CHANNEL?.trim();
  if (channel) return channel;
  // `app` pushes to PushPlus mobile app (lock-screen notification); `wechat` goes to 服务号 inbox only.
  return 'app';
}

function isWxPusherConfigured(): boolean {
  return Boolean(process.env.WXPUSHER_SPT?.trim());
}

function isWeChatConfigured(): boolean {
  return isWxPusherConfigured() || Boolean(process.env.PUSHPLUS_TOKEN?.trim());
}

function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.CALLMEBOT_PHONE && process.env.CALLMEBOT_APIKEY);
}

type AlertChannel = 'telegram' | 'whatsapp' | 'wechat' | 'resend';

function isTelegramConfigured(routing?: AlertRouting): boolean {
  const chatId = routing?.telegramChatId ?? process.env.TELEGRAM_CHAT_ID;
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && chatId);
}

function isResendConfigured(routing?: AlertRouting): boolean {
  const alertTo = routing?.alertEmail ?? process.env.ALERT_TO;
  return Boolean(process.env.RESEND_API_KEY && process.env.ALERT_FROM && alertTo);
}

/** Ordered fallback chain: Telegram → WhatsApp → PushPlus → Resend. Skips unconfigured channels. */
function getAlertFallbackChain(routing?: AlertRouting): AlertChannel[] {
  const chain: AlertChannel[] = [];
  if (isTelegramConfigured(routing)) chain.push('telegram');
  if (isWhatsAppConfigured()) chain.push('whatsapp');
  if (isWeChatConfigured()) chain.push('wechat');
  if (isResendConfigured(routing)) chain.push('resend');
  return chain;
}

function resolveChannel(routing?: AlertRouting): AlertChannel | null {
  return getAlertFallbackChain(routing)[0] ?? null;
}

async function deliverAlert(
  channel: AlertChannel,
  payload: AlertPayload,
  routing: AlertRouting,
): Promise<void> {
  switch (channel) {
    case 'telegram':
      await sendTelegramMessage(payload, routing.telegramChatId ?? process.env.TELEGRAM_CHAT_ID!);
      return;
    case 'whatsapp':
      await sendWhatsAppMessage(payload);
      return;
    case 'wechat':
      await sendWeChatMessage(payload);
      return;
    case 'resend':
      await sendResendEmail(payload, routing.alertEmail ?? process.env.ALERT_TO!);
      return;
    default: {
      const _exhaustive: never = channel;
      throw new Error(`Unknown alert channel: ${_exhaustive}`);
    }
  }
}

async function sendResendText(alertTo: string, subject: string, text: string): Promise<void> {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: process.env.ALERT_FROM!, to: alertTo, subject, text });
  if (error) {
    throw new Error(error.message);
  }
}

async function sendResendEmail(payload: AlertPayload, alertTo: string): Promise<void> {
  await sendResendText(alertTo, buildEmailSubject(payload.runId), buildEmailBody(payload));
}

async function sendTelegramText(chatId: string, text: string): Promise<void> {
  const TelegramBot = (await import('node-telegram-bot-api')).default;
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
  await bot.sendMessage(chatId, text.slice(0, TELEGRAM_MAX_LENGTH));
}

async function sendTelegramMessage(payload: AlertPayload, chatId: string): Promise<void> {
  await sendTelegramText(chatId, buildTelegramMessage(payload));
}

async function sendWxPusherText(summary: string, content: string): Promise<void> {
  const spt = process.env.WXPUSHER_SPT!.trim();
  const res = await fetch('https://wxpusher.zjiecode.com/api/send/message/simple-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spt, content, summary, contentType: 1 }),
  });

  const data = (await res.json()) as { code?: number; msg?: string; success?: boolean };
  const ok = data.success === true || data.code === 1000;
  if (!res.ok || !ok) {
    throw new Error(`WxPusher ${data.code ?? res.status}: ${data.msg ?? 'unknown error'}`);
  }
}

async function sendWeChatText(title: string, content: string): Promise<void> {
  if (isWxPusherConfigured()) {
    await sendWxPusherText(title, content);
    return;
  }

  const token = process.env.PUSHPLUS_TOKEN!.trim();
  const channel = resolvePushPlusChannel();
  const res = await fetch('https://www.pushplus.plus/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, title, content, template: 'txt', channel }),
  });

  const data = (await res.json()) as { code?: number; msg?: string };
  if (!res.ok || data.code !== 200) {
    throw new Error(`PushPlus ${data.code ?? res.status}: ${data.msg ?? 'unknown error'}`);
  }
}

async function sendWeChatMessage(payload: AlertPayload): Promise<void> {
  await sendWeChatText(`[零元] Subito blocked — ${payload.failureCode}`, buildWeChatMessage(payload));
}

async function sendWhatsAppText(message: string): Promise<void> {
  const phone = process.env.CALLMEBOT_PHONE!;
  const apikey = process.env.CALLMEBOT_APIKEY!;
  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', phone);
  url.searchParams.set('text', message);
  url.searchParams.set('apikey', apikey);

  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`CallMeBot HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  if (/message not sent/i.test(body)) {
    throw new Error(`CallMeBot rejected: ${body.slice(0, 200)}`);
  }
  if (/error|fail/i.test(body) && !/success|queued/i.test(body)) {
    throw new Error(`CallMeBot rejected: ${body.slice(0, 200)}`);
  }
}

async function sendWhatsAppMessage(payload: AlertPayload): Promise<void> {
  await sendWhatsAppText(buildWhatsAppMessage(payload));
}

export type OperatorTextMessage = { subject: string; text: string };

/**
 * Plain informational message to the operator over the same fallback chain as soft-block alerts
 * (Telegram → WhatsApp → WeChat → email). Never throws.
 */
export async function notifyOperatorText(
  supabase: SupabaseClient,
  message: OperatorTextMessage,
): Promise<void> {
  let routing: AlertRouting;
  try {
    routing = await loadAlertRouting(supabase);
  } catch (err) {
    console.error(`OPERATOR_TEXT_FAILED stage=routing error=${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  const chain = getAlertFallbackChain(routing);
  if (chain.length === 0) {
    console.error('OPERATOR_TEXT_FAILED channel=none error=No alerting credentials configured');
    return;
  }
  for (const channel of chain) {
    try {
      switch (channel) {
        case 'telegram':
          await sendTelegramText(routing.telegramChatId ?? process.env.TELEGRAM_CHAT_ID!, message.text);
          return;
        case 'whatsapp':
          await sendWhatsAppText(message.text.slice(0, WHATSAPP_MAX_LENGTH));
          return;
        case 'wechat':
          await sendWeChatText(message.subject, message.text.slice(0, WECHAT_MAX_LENGTH));
          return;
        case 'resend':
          await sendResendText(routing.alertEmail ?? process.env.ALERT_TO!, message.subject, message.text);
          return;
      }
    } catch (err) {
      console.error(`OPERATOR_TEXT_FAILED channel=${channel} error=${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

export async function notifyOperator(
  supabase: SupabaseClient,
  payload: AlertPayload,
  options: { emailOnly?: boolean } = {},
): Promise<void> {
  const routing = await loadAlertRouting(supabase);

  if (options.emailOnly) {
    if (!isResendConfigured(routing)) {
      console.error(
        `ALERT_DELIVERY_FAILED channel=email-only run_id=${payload.runId} error=No email alerting credentials configured`,
      );
      return;
    }
    try {
      await deliverAlert('resend', payload, routing);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`ALERT_DELIVERY_FAILED channel=resend run_id=${payload.runId} error=${message}`);
    }
    return;
  }

  const chain = getAlertFallbackChain(routing);
  if (chain.length === 0) {
    console.error(
      `ALERT_DELIVERY_FAILED channel=none run_id=${payload.runId} error=No alerting credentials configured`,
    );
    return;
  }

  const failures: string[] = [];
  for (const channel of chain) {
    try {
      await deliverAlert(channel, payload, routing);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`ALERT_DELIVERY_FAILED channel=${channel} run_id=${payload.runId} error=${message}`);
      failures.push(`${channel}: ${message}`);
    }
  }

  console.error(
    `ALERT_DELIVERY_EXHAUSTED run_id=${payload.runId} chain=${chain.join('>')} errors=${failures.join(' | ')}`,
  );
}

export {
  buildEmailSubject,
  buildEmailBody,
  buildWeChatMessage,
  buildWhatsAppMessage,
  buildTelegramMessage,
  isWeChatConfigured,
  isWxPusherConfigured,
  isWhatsAppConfigured,
  isTelegramConfigured,
  isResendConfigured,
  getAlertFallbackChain,
  loadAlertRouting,
  resolveChannel,
  resolvePushPlusChannel,
};
