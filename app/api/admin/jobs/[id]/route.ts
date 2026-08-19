import { NextResponse } from 'next/server';
import { requireOperatorSession } from '@/lib/admin/operator-route';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  const { id } = await context.params;

  const { data, error } = await session.supabase
    .from('scrape_jobs')
    .select('id, source_slug, crawl_mode, status, message, requested_at, started_at, completed_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(
    { job: data },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
