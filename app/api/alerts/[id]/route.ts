import { NextResponse } from 'next/server';
import { canCreateAlert } from '@/lib/alerts/limit';
import {
  alertHasKeywordOrZone,
  UpdateAlertSchema,
  type AlertRow,
} from '@/lib/alerts/schemas';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { messages } from '@/messages/it';

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

  const { data: existing, error: fetchError } = await supabase
    .from('alerts')
    .select('id, keyword, zone, enabled')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const nextEnabled = parsed.data.enabled ?? existing.enabled;
  const nextKeyword =
    parsed.data.keyword !== undefined ? parsed.data.keyword : existing.keyword;
  const nextZone = parsed.data.zone !== undefined ? parsed.data.zone : existing.zone;

  if (!alertHasKeywordOrZone(nextKeyword, nextZone)) {
    return NextResponse.json(
      { error: 'At least one of keyword or zone is required' },
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

  const { data, error } = await supabase
    .from('alerts')
    .update({
      enabled: nextEnabled,
      keyword: nextKeyword,
      zone: nextZone,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, keyword, zone, enabled, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alert: data as AlertRow });
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
