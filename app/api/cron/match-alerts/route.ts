import { NextResponse } from 'next/server';

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

/** Vercel Cron stub — full matcher ships in Plan 05 (D-106). */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ status: 'stub', processed: 0 });
}
