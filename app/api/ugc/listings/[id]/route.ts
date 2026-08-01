import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { mapDeliveredTransition, mapReservedTransition } from '@/lib/ugc/status';
import { messages } from '@/messages/it';

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

  const update =
    parsed.data.action === 'reserved'
      ? mapReservedTransition()
      : mapDeliveredTransition();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('listings')
    .update(update)
    .eq('id', parsedId.data)
    .eq('owner_user_id', user.id)
    .select('status')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: data.status,
    message:
      parsed.data.action === 'reserved'
        ? messages.manage.reservedToast
        : undefined,
  });
}
