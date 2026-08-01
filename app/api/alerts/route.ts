import { NextResponse } from 'next/server';
import { canCreateAlert } from '@/lib/alerts/limit';
import { CreateAlertSchema, type AlertRow } from '@/lib/alerts/schemas';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { messages } from '@/messages/it';

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alerts')
    .select('id, keyword, zone, enabled, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: (data ?? []) as AlertRow[] });
}

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();

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

  const { keyword, zone } = parsed.data;

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      user_id: user.id,
      keyword: keyword ?? null,
      zone: zone ?? null,
      enabled: true,
    })
    .select('id, keyword, zone, enabled, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alert: data as AlertRow }, { status: 201 });
}
