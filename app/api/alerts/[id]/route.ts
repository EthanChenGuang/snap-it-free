import { NextResponse } from 'next/server';
import { canCreateAlert } from '@/lib/alerts/limit';
import { selectAlertById, updateAlertRow } from '@/lib/alerts/db';
import {
  alertHasKeywordOrLocation,
  UpdateAlertSchema,
} from '@/lib/alerts/schemas';
import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getMessages } from '@/messages';
import type { VeniceZone } from '@/lib/listings/types';

const messages = getMessages('zh');

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = UpdateAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await selectAlertById(supabase, id, user.id);

  if (fetchError) {
    return NextResponse.json({ error: fetchError }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const nextEnabled = parsed.data.enabled ?? Boolean(existing.enabled);
  const nextKeyword =
    parsed.data.keyword !== undefined
      ? parsed.data.keyword
      : ((existing.keyword as string | null) ?? null);
  const nextZone =
    parsed.data.zone !== undefined
      ? parsed.data.zone
      : ((existing.zone as VeniceZone | null) ?? null);
  const nextCity =
    parsed.data.city !== undefined
      ? parsed.data.city
      : ((existing.city as ConsumerCityKey | null) ?? null);

  if (!alertHasKeywordOrLocation(nextKeyword, nextZone, nextCity)) {
    return NextResponse.json(
      { error: 'At least one of keyword, zone, or city is required' },
      { status: 400 },
    );
  }

  if (nextEnabled && !existing.enabled) {
    const { count, error: countError } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (!canCreateAlert(count ?? 0)) {
      return NextResponse.json({ error: messages.settings.alerts.limitReached }, { status: 422 });
    }
  }

  const { data, error } = await updateAlertRow(supabase, id, user.id, {
    enabled: nextEnabled,
    keyword: nextKeyword,
    zone: nextZone,
    city: nextCity,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ alert: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
