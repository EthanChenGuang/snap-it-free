import type { SupabaseClient } from '@supabase/supabase-js';
import { collectPlatformUsageSnapshot } from './platform-usage-collect';
import {
  formatHours,
  formatPlatformTokens,
  formatPlatformUsd,
  formatTraffic,
  type PlatformUsageSnapshot,
} from './platform-usage';
import { formatQuotaBytes } from './quota-usage';

export const DEFAULT_THRESHOLDS = {
  supabaseDbPercent: 80,
  supabaseStoragePercent: 80,
  translationMonthlyUsd: 10,
  proxyBlockRatePercent: 20,
} as const;

export const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export type ThresholdAlertKey =
  | 'supabase_db'
  | 'supabase_storage'
  | 'translation_cost'
  | 'proxy_block_rate';

export type ThresholdAlert = {
  key: ThresholdAlertKey;
  platform: string;
  message: string;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  unit: '%' | 'usd' | 'count';
};

export type ThresholdCheckResult = {
  checkedAt: string;
  alerts: ThresholdAlert[];
  notificationsSent: Array<{ key: ThresholdAlertKey; channel: 'telegram' | 'email' }>;
  skippedCooldown: ThresholdAlertKey[];
};

type AlertRouting = {
  telegramChatId: string | null;
  alertEmail: string | null;
};

function evaluateThresholds(snapshot: PlatformUsageSnapshot): ThresholdAlert[] {
  const alerts: ThresholdAlert[] = [];

  if (snapshot.supabase.databasePercent >= DEFAULT_THRESHOLDS.supabaseDbPercent) {
    alerts.push({
      key: 'supabase_db',
      platform: 'Supabase',
      message: `[Supabase] 数据库使用量已达 ${snapshot.supabase.databasePercent}%，请及时清理`,
      severity: snapshot.supabase.databasePercent >= 90 ? 'critical' : 'warning',
      value: snapshot.supabase.databasePercent,
      threshold: DEFAULT_THRESHOLDS.supabaseDbPercent,
      unit: '%',
    });
  }

  if (snapshot.supabase.storagePercent >= DEFAULT_THRESHOLDS.supabaseStoragePercent) {
    alerts.push({
      key: 'supabase_storage',
      platform: 'Supabase',
      message: `[Supabase] Storage 使用量已达 ${snapshot.supabase.storagePercent}%，请清理 UGC 照片`,
      severity: snapshot.supabase.storagePercent >= 90 ? 'critical' : 'warning',
      value: snapshot.supabase.storagePercent,
      threshold: DEFAULT_THRESHOLDS.supabaseStoragePercent,
      unit: '%',
    });
  }

  if (snapshot.translation.monthTotalUsd >= DEFAULT_THRESHOLDS.translationMonthlyUsd) {
    alerts.push({
      key: 'translation_cost',
      platform: 'Translation LLM',
      message: `[翻译 LLM] 本月费用已达 ${formatPlatformUsd(snapshot.translation.monthTotalUsd)}（阈值 ${formatPlatformUsd(DEFAULT_THRESHOLDS.translationMonthlyUsd)}/月）`,
      severity: 'warning',
      value: snapshot.translation.monthTotalUsd,
      threshold: DEFAULT_THRESHOLDS.translationMonthlyUsd,
      unit: 'usd',
    });
  }

  if (snapshot.proxy.blockRatePercent >= DEFAULT_THRESHOLDS.proxyBlockRatePercent) {
    alerts.push({
      key: 'proxy_block_rate',
      platform: 'Proxies',
      message: `[代理] Block Rate 已达 ${snapshot.proxy.blockRatePercent}%（7 天内 ${snapshot.proxy.blockedRunCount}/${snapshot.proxy.totalRunCount} 次运行受阻）`,
      severity: snapshot.proxy.blockRatePercent >= 40 ? 'critical' : 'warning',
      value: snapshot.proxy.blockRatePercent,
      threshold: DEFAULT_THRESHOLDS.proxyBlockRatePercent,
      unit: '%',
    });
  }

  return alerts;
}

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

async function getLastAlertTime(
  supabase: SupabaseClient,
  alertKey: ThresholdAlertKey,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('threshold_alert_events')
    .select('triggered_at')
    .eq('alert_key', alertKey)
    .order('triggered_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.message.includes('threshold_alert_events')) {
      return null;
    }
    throw error;
  }

  if (!data?.triggered_at) {
    return null;
  }

  return new Date(data.triggered_at as string).getTime();
}

async function recordAlertEvent(
  supabase: SupabaseClient,
  alert: ThresholdAlert,
  channel: 'telegram' | 'email',
): Promise<void> {
  const { error } = await supabase.from('threshold_alert_events').insert({
    alert_key: alert.key,
    message: alert.message,
    channel,
    severity: alert.severity,
  });

  if (error && !error.message.includes('threshold_alert_events')) {
    console.warn('[recordAlertEvent]', error.message);
  }
}

function buildTelegramMarkdown(alerts: ThresholdAlert[], snapshot: PlatformUsageSnapshot): string {
  const lines = [
    '⚠️ *平台资源阈值告警*',
    '',
    ...alerts.map((alert) => `• ${alert.message}`),
    '',
    '*当前快照*',
    `• Supabase DB: ${formatQuotaBytes(snapshot.supabase.databaseBytes)} (${snapshot.supabase.databasePercent}%)`,
    `• Vercel: ${formatTraffic(snapshot.vercel.bandwidthBytes)} · ${snapshot.vercel.edgeRequests.toLocaleString()} edge req`,
    `• Fly.io: ${formatHours(snapshot.flyio.instanceHours)} · ${formatPlatformUsd(snapshot.flyio.estimatedCostUsd)}`,
    `• 翻译 LLM: ${formatPlatformTokens(snapshot.translation.totalTokens)} · ${formatPlatformUsd(snapshot.translation.monthTotalUsd)}`,
    `• 代理: ${snapshot.proxy.requestCount.toLocaleString()} req · ${formatTraffic(snapshot.proxy.estimatedTrafficBytes)}`,
    '',
    '— 零元 Admin Console',
  ];
  return lines.join('\n');
}

function buildEmailHtml(alerts: ThresholdAlert[], snapshot: PlatformUsageSnapshot): string {
  const alertItems = alerts.map((alert) => `<li>${alert.message}</li>`).join('');
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1d1d1f;">
<h2 style="color:#ff9500;">⚠️ 平台资源阈值告警</h2>
<ul>${alertItems}</ul>
<h3>当前快照</h3>
<ul>
<li>Supabase DB: ${formatQuotaBytes(snapshot.supabase.databaseBytes)} (${snapshot.supabase.databasePercent}%)</li>
<li>Vercel: ${formatTraffic(snapshot.vercel.bandwidthBytes)} · ${snapshot.vercel.edgeRequests.toLocaleString()} edge req</li>
<li>Fly.io: ${formatHours(snapshot.flyio.instanceHours)} · ${formatPlatformUsd(snapshot.flyio.estimatedCostUsd)}</li>
<li>翻译 LLM: ${formatPlatformTokens(snapshot.translation.totalTokens)} · ${formatPlatformUsd(snapshot.translation.monthTotalUsd)}</li>
<li>代理: ${snapshot.proxy.requestCount.toLocaleString()} req · ${formatTraffic(snapshot.proxy.estimatedTrafficBytes)}</li>
</ul>
<p style="color:#86868b;font-size:12px;">— 零元 Admin Console</p>
</body></html>`;
}

async function sendTelegramAlert(
  chatId: string,
  text: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API ${response.status}: ${body}`);
  }
}

async function sendResendEmail(
  alertTo: string,
  alerts: ThresholdAlert[],
  snapshot: PlatformUsageSnapshot,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM;
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY or ALERT_FROM not configured');
  }

  const platforms = [...new Set(alerts.map((alert) => alert.platform))].join(', ');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [alertTo],
      subject: `[ALERT] 平台资源阈值 — ${platforms}`,
      html: buildEmailHtml(alerts, snapshot),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API ${response.status}: ${body}`);
  }
}

function resolveNotifyChannel(routing: AlertRouting): 'telegram' | 'email' | null {
  const chatId = routing.telegramChatId ?? process.env.TELEGRAM_CHAT_ID;
  if (process.env.TELEGRAM_BOT_TOKEN && chatId) {
    return 'telegram';
  }
  const alertTo = routing.alertEmail ?? process.env.ALERT_TO;
  if (process.env.RESEND_API_KEY && process.env.ALERT_FROM && alertTo) {
    return 'email';
  }
  return null;
}

export async function checkThresholdAlerts(
  supabase: SupabaseClient,
): Promise<ThresholdCheckResult> {
  const snapshot = await collectPlatformUsageSnapshot(supabase);
  const alerts = evaluateThresholds(snapshot);
  const routing = await loadAlertRouting(supabase);
  const channel = resolveNotifyChannel(routing);

  const notificationsSent: ThresholdCheckResult['notificationsSent'] = [];
  const skippedCooldown: ThresholdAlertKey[] = [];
  const now = Date.now();

  const dueAlerts: ThresholdAlert[] = [];
  for (const alert of alerts) {
    const lastSent = await getLastAlertTime(supabase, alert.key);
    if (lastSent != null && now - lastSent < ALERT_COOLDOWN_MS) {
      skippedCooldown.push(alert.key);
      continue;
    }
    dueAlerts.push(alert);
  }

  if (dueAlerts.length > 0 && channel) {
    try {
      if (channel === 'telegram') {
        const chatId = routing.telegramChatId ?? process.env.TELEGRAM_CHAT_ID!;
        await sendTelegramAlert(chatId, buildTelegramMarkdown(dueAlerts, snapshot));
      } else {
        const alertTo = routing.alertEmail ?? process.env.ALERT_TO!;
        await sendResendEmail(alertTo, dueAlerts, snapshot);
      }

      for (const alert of dueAlerts) {
        await recordAlertEvent(supabase, alert, channel);
        notificationsSent.push({ key: alert.key, channel });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[checkThresholdAlerts] delivery failed channel=${channel} error=${message}`);
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    alerts,
    notificationsSent,
    skippedCooldown,
  };
}

export { evaluateThresholds };
