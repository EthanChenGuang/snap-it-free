// Test harness for the `contact` journey: a "mocked auth" signed-in browser WITHOUT an account.
//
// Safety model (nothing here signs up, writes to the DB or calls production):
//  1. A cookie-stripping reverse proxy sits in front of `next start`. The forged Supabase session cookie lives
//     only in the browser; the proxy removes every Cookie header before the request reaches the Next server,
//     so server-side `supabase.auth.getUser()` never sends the forged token to the real project.
//  2. Browser-side requests to the Supabase host are intercepted: `/auth/v1/**` is answered locally; any other
//     request carrying the forged bearer gets an empty-but-valid local answer; only anonymous (publishable key)
//     reads pass through. Realtime websockets are closed.
//  3. `/api/contact/translate` is scripted per scenario (the real route would 401 and call Gemini).
//  4. The seller's site (subito.it) is stubbed so the popup never reaches the real site.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export const FORGED_REFRESH = 'forged-refresh-token';
export const FAKE_USER = {
  id: '00000000-0000-4000-8000-00000000c0de',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'mock-user@example.invalid',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};

const b64url = (value) => Buffer.from(value).toString('base64url');

/** Reads only the public Supabase URL from the repo's .env.local (never prints it, never reads the key). */
export function readSupabaseUrl(repo) {
  const text = fs.readFileSync(path.join(repo, '.env.local'), 'utf8');
  const line = text.split('\n').find((l) => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='));
  if (!line) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing in .env.local');
  return line.slice(line.indexOf('=') + 1).trim().replace(/^"|"$/g, '');
}

export function forgeSession() {
  const exp = Math.floor(Date.now() / 1000) + 6 * 3600;
  const payload = { sub: FAKE_USER.id, aud: 'authenticated', role: 'authenticated', email: FAKE_USER.email, exp, iat: exp - 3600 };
  const accessToken = `${b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}.forged`;
  const session = {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 6 * 3600,
    expires_at: exp,
    refresh_token: FORGED_REFRESH,
    user: FAKE_USER,
  };
  return { accessToken, session };
}

export function cookieFor(supabaseUrl, session, origin) {
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  return {
    name: `sb-${ref}-auth-token`,
    value: `base64-${b64url(JSON.stringify(session))}`,
    url: origin,
  };
}

/**
 * Reverse proxy to `upstream`. Strips Cookie from every request; counts how many carried one.
 * `mutate` (optional) rewrites a text response body: (pathname, body) => body.
 */
export async function startStrippingProxy(upstream) {
  const target = new URL(upstream);
  const stats = { requests: 0, cookiesStripped: 0 };
  const hooks = { mutate: null };
  const server = http.createServer((req, res) => {
    stats.requests += 1;
    if (req.headers.cookie) stats.cookiesStripped += 1;
    const headers = { ...req.headers, host: target.host, 'accept-encoding': 'identity' };
    delete headers.cookie;
    const upstreamReq = http.request(
      { host: target.hostname, port: target.port, path: req.url, method: req.method, headers },
      (up) => {
        const type = String(up.headers['content-type'] ?? '');
        const pathname = new URL(req.url, 'http://x').pathname;
        if (hooks.mutate && /text\/(html|x-component)/.test(type)) {
          const chunks = [];
          up.on('data', (c) => chunks.push(c));
          up.on('end', () => {
            const body = hooks.mutate(pathname, Buffer.concat(chunks).toString('utf8'));
            const out = Buffer.from(body, 'utf8');
            const h = { ...up.headers, 'content-length': String(out.length) };
            delete h['transfer-encoding'];
            res.writeHead(up.statusCode ?? 200, h);
            res.end(out);
          });
          return;
        }
        res.writeHead(up.statusCode ?? 200, up.headers);
        up.pipe(res);
      },
    );
    upstreamReq.on('error', () => {
      res.statusCode = 502;
      res.end();
    });
    req.pipe(upstreamReq);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    stats,
    hooks,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** Rewrites the listing inside the server-rendered payload, to exercise states the live data does not have. */
export function listingVariant(listingId, edit) {
  return (pathname, body) => {
    if (!pathname.includes(listingId)) return body;
    const start = body.indexOf(`\\"listing\\":{\\"id\\":\\"${listingId}\\"`);
    if (start < 0) return body;
    const end = body.indexOf('\\"similarListings\\"', start);
    const segment = body.slice(start, end < 0 ? undefined : end);
    return body.slice(0, start) + edit(segment) + (end < 0 ? '' : body.slice(end));
  };
}

const json = (status, body, extra = {}) => ({
  status,
  contentType: 'application/json',
  headers: { 'access-control-allow-origin': '*', ...extra },
  body: JSON.stringify(body),
});

/**
 * Installs the Supabase mocks on a context. `audit.leaked` counts requests that carried the forged token and
 * were NOT answered locally (must stay 0); `audit.mocked` counts the ones answered locally.
 */
export async function installSupabaseMocks(context, { supabaseUrl, accessToken, session, signedIn }) {
  const host = new URL(supabaseUrl).host;
  const audit = { mocked: 0, authCalls: 0, anonPassed: 0, leaked: 0 };
  await context.route(
    (u) => u.host === host,
    async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      const headers = req.headers();
      if (req.method() === 'OPTIONS') {
        audit.mocked += 1;
        return route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': '*',
          },
        });
      }
      if (u.pathname.startsWith('/auth/v1/')) {
        audit.authCalls += 1;
        audit.mocked += 1;
        if (u.pathname.endsWith('/user')) return route.fulfill(json(signedIn ? 200 : 401, signedIn ? FAKE_USER : { message: 'no session' }));
        if (u.pathname.endsWith('/token')) return route.fulfill(json(200, session));
        if (u.pathname.endsWith('/logout')) return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
        return route.fulfill(json(200, {}));
      }
      const bearer = headers.authorization ?? '';
      if (accessToken && (bearer.includes(accessToken) || u.search.includes(accessToken))) {
        audit.mocked += 1;
        const accept = headers.accept ?? '';
        if (accept.includes('vnd.pgrst.object')) {
          return route.fulfill(json(406, { code: 'PGRST116', message: 'The result contains 0 rows', details: null, hint: null }));
        }
        if (req.method() === 'GET' || req.method() === 'HEAD') {
          return route.fulfill(json(200, [], { 'content-range': '*/0' }));
        }
        return route.fulfill(json(req.method() === 'POST' ? 201 : 204, req.method() === 'POST' ? [] : null));
      }
      audit.anonPassed += 1;
      const haystack = JSON.stringify(headers) + req.url() + (req.postData() ?? '');
      if (accessToken && haystack.includes(accessToken)) audit.leaked += 1; // cannot happen: handled above
      return route.continue();
    },
  );
  await context.routeWebSocket((u) => u.host === host, (ws) => ws.close());
  return audit;
}

/** Stub the seller's site so popups never reach the real one. */
export async function stubSellerSite(context) {
  const seen = [];
  await context.route(/^https:\/\/(www\.)?(subito|vinted|wallapop|facebook)\.(it|com)\//, (route) => {
    seen.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Seller page (stub)</title><body style="font:20px sans-serif;padding:24px"><h1>Seller page (stub)</h1><textarea id="msg" style="width:100%;height:120px"></textarea></body>',
    });
  });
  return seen;
}
