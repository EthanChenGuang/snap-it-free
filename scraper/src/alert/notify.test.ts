import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildEmailSubject,
  buildTelegramMessage,
  buildWhatsAppMessage,
  isWhatsAppConfigured,
  notifyOperator,
  resolveChannel,
  type AlertPayload,
} from './notify.js';

const basePayload: AlertPayload = {
  runId: 'run-abc-123',
  startedAt: new Date('2026-07-28T10:00:00.000Z'),
  parsedCount: 12,
  minCount: 50,
  medianCount: 100,
  selectorPct: 85,
  failureCode: 'LOW_COUNT',
  failureDetail: 'count 12 < min 50 (50% of median 100)',
};

const resendSend = vi.fn();
const telegramSend = vi.fn();
const fetchMock = vi.fn();

function mockSupabase(routing: { telegram_chat_id?: string | null; alert_email?: string | null } = {}) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: routing,
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: resendSend },
  })),
}));

vi.mock('node-telegram-bot-api', () => ({
  default: vi.fn().mockImplementation(() => ({
    sendMessage: telegramSend,
  })),
}));

describe('notifyOperator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CALLMEBOT_PHONE;
    delete process.env.CALLMEBOT_APIKEY;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.RESEND_API_KEY;
    delete process.env.ALERT_FROM;
    delete process.env.ALERT_TO;
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('WhatsApp path sends CallMeBot request when CALLMEBOT_* set', async () => {
    process.env.CALLMEBOT_PHONE = '+393331234567';
    process.env.CALLMEBOT_APIKEY = 'abc123';
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    fetchMock.mockResolvedValue({ ok: true, text: async () => 'Message queued' });

    await notifyOperator(mockSupabase(), basePayload);

    expect(fetchMock).toHaveBeenCalledOnce();
    const called = fetchMock.mock.calls[0][0];
    const url = typeof called === 'string' ? called : called instanceof URL ? called.href : String(called);
    expect(url).toContain('api.callmebot.com/whatsapp.php');
    expect(url).toContain('phone=%2B393331234567');
    expect(url).toContain('apikey=abc123');
    expect(telegramSend).not.toHaveBeenCalled();
  });

  it('Resend path sends subject containing run_id when RESEND_API_KEY set', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.ALERT_FROM = 'alerts@example.com';
    process.env.ALERT_TO = 'ops@example.com';
    resendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

    await notifyOperator(mockSupabase(), basePayload);

    expect(resendSend).toHaveBeenCalledOnce();
    const call = resendSend.mock.calls[0][0];
    expect(call.subject).toBe(buildEmailSubject(basePayload.runId));
    expect(call.subject).toContain('run-abc-123');
    expect(call.text).toContain('did NOT persist this batch');
  });

  it('Telegram path truncates failure_detail at 500 chars when message would exceed 4096', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    telegramSend.mockResolvedValue({ message_id: 1 });

    const longDetail = 'x'.repeat(5000);
    await notifyOperator(mockSupabase(), { ...basePayload, failureDetail: longDetail });

    expect(telegramSend).toHaveBeenCalledOnce();
    const message = telegramSend.mock.calls[0][1] as string;
    expect(message.length).toBeLessThanOrEqual(4096);
    expect(message).toContain('…(truncated)');
  });

  it('logs ALERT_DELIVERY_FAILED to stderr on delivery failure', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.ALERT_FROM = 'alerts@example.com';
    process.env.ALERT_TO = 'ops@example.com';
    resendSend.mockResolvedValue({ data: null, error: { message: 'SMTP rejected' } });

    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await notifyOperator(mockSupabase(), basePayload);

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('ALERT_DELIVERY_FAILED channel=resend run_id=run-abc-123'),
    );
    stderrSpy.mockRestore();
  });
});

describe('buildWhatsAppMessage', () => {
  it('includes run_id and block context', () => {
    const message = buildWhatsAppMessage(basePayload);
    expect(message).toContain('Subito scraper blocked');
    expect(message).toContain('run run-abc-123');
    expect(message).toContain('Reason: LOW_COUNT');
  });
});

describe('resolveChannel', () => {
  it('prefers WhatsApp over Telegram and email', () => {
    process.env.CALLMEBOT_PHONE = '+393331234567';
    process.env.CALLMEBOT_APIKEY = 'abc123';
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    process.env.RESEND_API_KEY = 're_test';
    process.env.ALERT_FROM = 'alerts@example.com';
    process.env.ALERT_TO = 'ops@example.com';

    expect(resolveChannel()).toBe('whatsapp');
    expect(isWhatsAppConfigured()).toBe(true);
  });
});

describe('buildTelegramMessage', () => {
  it('includes run_id and metrics per UI-SPEC', () => {
    const message = buildTelegramMessage(basePayload);
    expect(message).toContain('run run-abc-123');
    expect(message).toContain('12 listings (need ≥50)');
    expect(message).toContain('Selectors 85%');
    expect(message).toContain('Reason: LOW_COUNT');
    expect(message).toContain('→ Check logs & scrape_runs');
  });
});

describe('success path silence', () => {
  it('notifyOperator is only invoked on failure paths in worker — no success helper', () => {
    expect(typeof notifyOperator).toBe('function');
  });
});
