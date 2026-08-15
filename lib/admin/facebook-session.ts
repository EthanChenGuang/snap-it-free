import { spawn } from 'node:child_process';
import path from 'node:path';

export type FacebookSessionCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

export type FacebookSessionPayload = {
  cookies: FacebookSessionCookie[];
};

export type FacebookSessionProbeReason = 'session_expired' | 'invalid_format';

export type FacebookSessionProbeResult =
  | { ok: true }
  | { ok: false; reason: FacebookSessionProbeReason };

function isCookieRecord(value: unknown): value is FacebookSessionCookie {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === 'string' &&
    typeof record.value === 'string' &&
    typeof record.domain === 'string' &&
    typeof record.path === 'string'
  );
}

/** Parse operator session JSON — cookie array or { cookies: [...] } (D-18-10). */
export function parseFacebookSessionJson(raw: string): FacebookSessionPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('invalid_format');
  }

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as FacebookSessionPayload).cookies)) {
    const cookies = (parsed as FacebookSessionPayload).cookies;
    if (!cookies.every(isCookieRecord)) {
      throw new Error('invalid_format');
    }
    return { cookies };
  }

  if (Array.isArray(parsed)) {
    if (!parsed.every(isCookieRecord)) {
      throw new Error('invalid_format');
    }
    return { cookies: parsed };
  }

  throw new Error('invalid_format');
}

export function hasFacebookAuthCookie(cookies: FacebookSessionCookie[]): boolean {
  return cookies.some((cookie) => cookie.name === 'c_user' && Boolean(cookie.value));
}

/** Run scraper probe subprocess — never logs cookie values (T-18-Crypto). */
export function probeFacebookSessionRemote(
  sessionJson: string,
  proxyUrl: string,
): Promise<FacebookSessionProbeResult> {
  return new Promise((resolve) => {
    const scraperRoot = path.join(process.cwd(), 'scraper');
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'src/probe-facebook-session-cli.ts', sessionJson],
      {
        cwd: scraperRoot,
        env: {
          ...process.env,
          PROXY_URL: proxyUrl,
          CRAWLEE_PERSIST_STORAGE: 'false',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.on('close', () => {
      try {
        const payload = JSON.parse(stdout.trim()) as FacebookSessionProbeResult;
        if (payload && typeof payload === 'object' && 'ok' in payload) {
          resolve(payload);
          return;
        }
      } catch {
        // fall through
      }
      resolve({ ok: false, reason: 'session_expired' });
    });
  });
}
