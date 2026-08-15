import { NextResponse } from 'next/server';
import {
  hasFacebookAuthCookie,
  parseFacebookSessionJson,
  probeFacebookSessionRemote,
} from '@/lib/admin/facebook-session';
import { resolveSubitoProxyUrl } from '@/lib/admin/proxy-url';
import { getOperatorSession } from '@/lib/admin/require-operator';
import { TestFacebookSessionSchema } from '@/lib/admin/schemas';

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await context.params;
  if (slug !== 'facebook') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = TestFacebookSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const sessionPayload = parseFacebookSessionJson(parsed.data.session_json);
    if (!hasFacebookAuthCookie(sessionPayload.cookies)) {
      return NextResponse.json({ ok: false, reason: 'invalid_format' });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_format' });
  }

  const proxyUrl = await resolveSubitoProxyUrl(session.supabase);
  if (!proxyUrl) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_format', error: 'Residential proxy required — configure in Settings' },
      { status: 422 },
    );
  }

  const result = await probeFacebookSessionRemote(parsed.data.session_json.trim(), proxyUrl);
  return NextResponse.json(result);
}
