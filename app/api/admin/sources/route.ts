import { NextResponse } from 'next/server';
import { getSourcesWithLastRun } from '@/lib/admin/queries';
import { getOperatorSession } from '@/lib/admin/require-operator';

export async function GET() {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sources = await getSourcesWithLastRun();
  return NextResponse.json({ sources });
}
