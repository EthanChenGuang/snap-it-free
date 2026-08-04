import { NextResponse } from 'next/server';
import { getOperatorSession } from '@/lib/admin/require-operator';
import { UpdateGlobalConfigSchema } from '@/lib/admin/schemas';

type GlobalConfigRow = {
  id: number;
  global_pause: boolean;
  auto_translate: boolean;
  daily_translation_cap: number;
  translation_provider: string;
  telegram_chat_id: string | null;
  alert_email: string | null;
  proxy_enc: unknown;
  translations_today: number;
  translations_reset_date: string;
  updated_at: string;
};

function serializeConfig(row: GlobalConfigRow) {
  return {
    id: row.id,
    global_pause: row.global_pause,
    auto_translate: row.auto_translate,
    daily_translation_cap: row.daily_translation_cap,
    translation_provider: row.translation_provider,
    telegram_chat_id: row.telegram_chat_id,
    alert_email: row.alert_email,
    proxy_configured: row.proxy_enc != null,
    translations_today: row.translations_today,
    translations_reset_date: row.translations_reset_date,
    updated_at: row.updated_at,
  };
}

export async function GET() {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await session.supabase
    .from('scraper_global_config')
    .select(
      'id, global_pause, auto_translate, daily_translation_cap, translation_provider, telegram_chat_id, alert_email, proxy_enc, translations_today, translations_reset_date, updated_at',
    )
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ config: serializeConfig(data as GlobalConfigRow) });
}

export async function PATCH(request: Request) {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = UpdateGlobalConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from('scraper_global_config')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select(
      'id, global_pause, auto_translate, daily_translation_cap, translation_provider, telegram_chat_id, alert_email, proxy_enc, translations_today, translations_reset_date, updated_at',
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: serializeConfig(data as GlobalConfigRow) });
}
