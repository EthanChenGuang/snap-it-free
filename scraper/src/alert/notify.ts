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

function buildEmailSubject(runId: string): string {
  return `[ALERT] 手慢无 scraper soft-block — run ${runId} failed validation`;
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
    '— 手慢无 (ShouManWu) ingestion worker',
  ].join('\n');
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

function resolveChannel(): 'telegram' | 'resend' | null {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    return 'telegram';
  }
  if (process.env.RESEND_API_KEY && process.env.ALERT_FROM && process.env.ALERT_TO) {
    return 'resend';
  }
  return null;
}

async function sendResendEmail(payload: AlertPayload): Promise<void> {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.ALERT_FROM!,
    to: process.env.ALERT_TO!,
    subject: buildEmailSubject(payload.runId),
    text: buildEmailBody(payload),
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function sendTelegramMessage(payload: AlertPayload): Promise<void> {
  const TelegramBot = (await import('node-telegram-bot-api')).default;
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
  await bot.sendMessage(process.env.TELEGRAM_CHAT_ID!, buildTelegramMessage(payload));
}

export async function notifyOperator(payload: AlertPayload): Promise<void> {
  const channel = resolveChannel();
  if (!channel) {
    console.error(
      `ALERT_DELIVERY_FAILED channel=none run_id=${payload.runId} error=No alerting credentials configured`,
    );
    return;
  }

  try {
    if (channel === 'telegram') {
      await sendTelegramMessage(payload);
    } else {
      await sendResendEmail(payload);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`ALERT_DELIVERY_FAILED channel=${channel} run_id=${payload.runId} error=${message}`);
  }
}

export { buildEmailSubject, buildEmailBody, buildTelegramMessage, resolveChannel };
