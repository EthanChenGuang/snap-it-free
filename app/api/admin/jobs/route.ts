import { NextResponse } from 'next/server';
import { sourcesMessages } from '@/components/admin/admin-messages';
import { requireOperatorSession } from '@/lib/admin/operator-route';
import { CreateJobSchema } from '@/lib/admin/schemas';

export async function POST(request: Request) {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { source_slug } = parsed.data;

  const { data: source, error: sourceError } = await session.supabase
    .from('scraper_sources')
    .select('slug, implementation_status')
    .eq('slug', source_slug)
    .maybeSingle();

  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }
  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  const isComingSoon = source.implementation_status === 'coming_soon';
  const status = isComingSoon ? 'skipped' : 'pending';
  const message = isComingSoon ? sourcesMessages.comingSoonRunBlocked : null;

  const { data: job, error: insertError } = await session.supabase
    .from('scrape_jobs')
    .insert({
      source_slug,
      status,
      requested_by: session.user.id,
      message,
    })
    .select('id, source_slug, status, requested_at, message')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ job, message }, { status: 201 });
}
