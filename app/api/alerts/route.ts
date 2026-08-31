import { NextResponse } from 'next/server';
import { canCreateAlert } from '@/lib/alerts/limit';
import { insertAlert, selectUserAlerts } from '@/lib/alerts/db';
import { CreateAlertSchema } from '@/lib/alerts/schemas';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getMessages } from '@/messages';

const messages = getMessages('zh');

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await selectUserAlerts(supabase, user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ alerts: data ?? [] });
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

  const { keyword, zone, city } = parsed.data;

  const { data, error } = await insertAlert(supabase, {
    user_id: user.id,
    keyword: keyword ?? null,
    zone: zone ?? null,
    city: city ?? null,
    enabled: true,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ alert: data }, { status: 201 });
}
