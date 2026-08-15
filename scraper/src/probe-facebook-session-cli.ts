/**
 * One-shot Facebook session probe for admin test-session API (D-18-10).
 * Invoked from lib/admin/facebook-session.ts subprocess — not for direct operator use.
 */
import { probeFacebookSession, type SessionPayload } from './facebook/session.js';

async function main(): Promise<void> {
  const raw = process.argv[2];
  const proxyUrl = process.env.PROXY_URL?.trim();

  if (!raw || !proxyUrl) {
    console.log(JSON.stringify({ ok: false, reason: 'invalid_format' }));
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(raw) as SessionPayload | SessionPayload['cookies'];
    const session: SessionPayload = Array.isArray(parsed) ? { cookies: parsed } : parsed;
    const result = await probeFacebookSession(session, proxyUrl);
    if (result === 'valid') {
      console.log(JSON.stringify({ ok: true }));
      return;
    }
    console.log(JSON.stringify({ ok: false, reason: 'session_expired' }));
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'invalid_session_format' || message === 'invalid_format') {
      console.log(JSON.stringify({ ok: false, reason: 'invalid_format' }));
      return;
    }
    console.log(JSON.stringify({ ok: false, reason: 'session_expired' }));
  }
}

main();
