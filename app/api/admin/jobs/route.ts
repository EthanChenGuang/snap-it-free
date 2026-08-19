import { NextResponse } from 'next/server';
import { sourcesMessages } from '@/components/admin/admin-messages';
import { dispatchScrapeJobSubprocess } from '@/lib/admin/execute-scrape-job';
import { requireOperatorSession } from '@/lib/admin/operator-route';
import { CreateJobSchema } from '@/lib/admin/schemas';

const inlineJobsEnabled = process.env.SCRAPER_INLINE_JOBS !== 'false';

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

  const { source_slug, crawl_mode } = parsed.data;

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
      crawl_mode,
      status,
      requested_by: session.user.id,
      message,
    })
    .select('id, source_slug, crawl_mode, status, requested_at, message')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Claim pending job and run locally so Admin manual triggers use latest scraper code
  // (avoids stale Fly worker with old Crawlee dedupe bug). Fly cron still handles pending
  // jobs when inline dispatch is disabled via SCRAPER_INLINE_JOBS=false.
  if (inlineJobsEnabled && job.status === 'pending') {
    const startedAt = new Date().toISOString();
    const { data: claimed } = await session.supabase
      .from('scrape_jobs')
      .update({ status: 'running', started_at: startedAt })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (claimed) {
      try {
        dispatchScrapeJobSubprocess(job.id);
      } catch (dispatchErr) {
        const detail =
          dispatchErr instanceof Error ? dispatchErr.message : 'Failed to start scraper subprocess';
        await session.supabase
          .from('scrape_jobs')
          .update({
            status: 'failed',
            message: detail,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        return NextResponse.json({ error: detail }, { status: 500 });
      }

      return NextResponse.json(
        { job: { ...job, status: 'running', started_at: startedAt }, message },
        { status: 201, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  return NextResponse.json({ job, message }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
