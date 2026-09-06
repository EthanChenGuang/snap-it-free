import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  applyOwnerListingStatusUpdate,
  resolveOwnerListingStatus,
} from '@/lib/ugc/patch-listing-status';
import { requireAuth } from '@/lib/supabase/auth';
import {
  mapDeliveredTransition,
  mapReservedTransition,
  canDeliver,
  canReserve,
} from '@/lib/ugc/status';
import { getMessages } from '@/messages';

const messages = getMessages('zh');

const patchSchema = z.object({
  action: z.enum(['reserved', 'delivered']),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const currentStatus = await resolveOwnerListingStatus(parsedId.data, user.id);
  if (!currentStatus) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (parsed.data.action === 'reserved' && !canReserve(currentStatus)) {
    return NextResponse.json(
      { error: 'Listing cannot be reserved in its current state' },
      { status: 422 },
    );
  }
  if (parsed.data.action === 'delivered' && !canDeliver(currentStatus)) {
    return NextResponse.json(
      { error: 'Listing cannot be marked delivered in its current state' },
      { status: 422 },
    );
  }

  const update =
    parsed.data.action === 'reserved'
      ? mapReservedTransition()
      : mapDeliveredTransition();

  const nextStatus = await applyOwnerListingStatusUpdate(parsedId.data, user.id, update);
  if (!nextStatus) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: nextStatus,
    message:
      parsed.data.action === 'reserved'
        ? messages.manage.reservedToast
        : undefined,
  });
}
