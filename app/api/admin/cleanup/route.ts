import { NextResponse } from 'next/server';
import { executeCleanup, getCleanupPreview } from '@/lib/admin/cleanup';
import { requireOperatorSession } from '@/lib/admin/operator-route';
import { ExecuteCleanupSchema } from '@/lib/admin/schemas';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  try {
    const supabase = createServiceClient();
    const preview = await getCleanupPreview(supabase);
    return NextResponse.json({ preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

  const parsed = ExecuteCleanupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'confirm: true is required' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const result = await executeCleanup(supabase);
    const totalDeleted =
      result.deletedExpiredListings +
      result.deletedHiddenScraperListings +
      result.deletedScrapeRejects +
      result.deletedScrapeRuns;
    return NextResponse.json({ result, totalDeleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cleanup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
