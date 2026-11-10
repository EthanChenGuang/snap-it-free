import { NextResponse } from 'next/server';
import { scoreUnscoredListings } from '@/lib/listings/appeal-score';
import { createServiceClient } from '@/lib/supabase/service';

export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  const userAgent = request.headers.get('user-agent') ?? '';
  return process.env.NODE_ENV === 'production' && userAgent.includes('vercel-cron');
}

/** Daily: give new listings an AI appeal score (lib/listings/appeal-score.ts). ~180 new items a day. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ skipped: 'no_gemini_key' });
  try {
    const summary = await scoreUnscoredListings(createServiceClient(), { apiKey, limit: 300, concurrency: 10 });
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scoring failed';
    console.error('score-appeal cron error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
