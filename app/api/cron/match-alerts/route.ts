import { NextResponse } from 'next/server';
import { processPendingListingEvents } from '@/lib/alerts/process-events';
import { createServiceClient } from '@/lib/supabase/service';

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const userAgent = request.headers.get('user-agent') ?? '';
  if (process.env.NODE_ENV === 'production' && userAgent.includes('vercel-cron')) {
    return true;
  }

  return false;
}

/** D-106: Vercel Cron poller — match pending listing_events → alert_matches. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const processed = await processPendingListingEvents(supabase);
    return NextResponse.json({ processed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed';
    console.error('match-alerts cron error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
