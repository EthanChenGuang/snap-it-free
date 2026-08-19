import { NextResponse } from 'next/server';
import { rescueRejectedListing } from '@/lib/admin/rescue-reject';
import { requireOperatorSession } from '@/lib/admin/operator-route';
import { createServiceClient } from '@/lib/supabase/service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing reject id' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const result = await rescueRejectedListing(supabase, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(
    {
      listingId: result.listingId,
      externalId: result.externalId,
      offlineRescue: result.offlineRescue,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
