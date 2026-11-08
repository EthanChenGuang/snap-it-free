import { NextResponse } from 'next/server';
import { requireOperatorSession } from '@/lib/admin/operator-route';
import { resolveUserEmail } from '@/lib/admin/operator-access';
import { decideFeaturedCandidate, featuredDecisionSchema } from '@/lib/featured/admin';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST { decision: 'approve' | 'reject' } — operator-only review of a featured candidate. */
export async function POST(request: Request, context: RouteContext) {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  // CSRF hardening: JSON only (a cross-site form post cannot send this content type without CORS preflight).
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'Expected application/json' }, { status: 415 });
  }

  const { id } = await context.params;
  if (!id || !UUID.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = featuredDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }

  const reviewer = resolveUserEmail(session.user) ?? session.user.id;
  const result = await decideFeaturedCandidate(session.supabase, id, parsed.data.decision, reviewer);
  if (!result.ok) {
    const status = result.code === 'not_pending' ? 409 : 500;
    return NextResponse.json({ error: result.code }, { status });
  }
  return NextResponse.json({ status: result.status }, { headers: { 'Cache-Control': 'no-store' } });
}
