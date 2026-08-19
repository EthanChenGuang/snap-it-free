import { NextResponse } from 'next/server';
import { getScrapeRunById } from '@/lib/admin/queries';
import { requireOperatorSession } from '@/lib/admin/operator-route';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  const { id } = await context.params;
  const run = await getScrapeRunById(id);

  if (!run) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(
    { run },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
