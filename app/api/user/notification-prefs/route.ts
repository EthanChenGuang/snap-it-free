import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import {
  isValidQuietHoursPayload,
  syncUserNotificationPrefs,
  type QuietHoursPrefs,
} from '@/lib/user/notification-prefs';

const DEFAULT_DND_PREFS: QuietHoursPrefs = {
  dndEnabled: false,
  quietStart: '22:00',
  quietEnd: '08:00',
};

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function mapRow(row: {
  dnd_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
}): QuietHoursPrefs {
  return {
    dndEnabled: row.dnd_enabled,
    quietStart: normalizeTime(row.quiet_start),
    quietEnd: normalizeTime(row.quiet_end),
  };
}

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_notification_prefs')
    .select('dnd_enabled, quiet_start, quiet_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(DEFAULT_DND_PREFS);
  }

  return NextResponse.json(mapRow(data));
}

export async function PATCH(request: Request) {
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

  if (!isValidQuietHoursPayload(body)) {
    return NextResponse.json({ error: 'Invalid notification prefs' }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await syncUserNotificationPrefs(supabase, user.id, body);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...body });
}
