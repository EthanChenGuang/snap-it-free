import { NextResponse } from 'next/server';
import { getSourcesWithLastRun } from '@/lib/admin/queries';
import { requireOperatorSession } from '@/lib/admin/operator-route';

export async function GET() {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  const sources = await getSourcesWithLastRun();
  return NextResponse.json({ sources });
}
