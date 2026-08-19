import { NextResponse } from 'next/server';
import { getPendingTranslationCount } from '@/lib/admin/queries';
import { requireOperatorSession } from '@/lib/admin/operator-route';

export async function GET() {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  try {
    const pendingCount = await getPendingTranslationCount();
    return NextResponse.json({ pendingCount }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pending count fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
