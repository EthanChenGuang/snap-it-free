import { NextResponse } from 'next/server';
import { getTranslationCostSummary } from '@/lib/admin/queries';
import { requireOperatorSession } from '@/lib/admin/operator-route';

export async function GET() {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  try {
    const summary = await getTranslationCostSummary();
    return NextResponse.json({ summary }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Translation cost summary failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
