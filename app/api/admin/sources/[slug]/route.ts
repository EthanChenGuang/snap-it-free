import { NextResponse } from 'next/server';
import { canEnableSource, getOperatorSession } from '@/lib/admin/require-operator';
import { UpdateSourceSchema } from '@/lib/admin/schemas';

type RouteContext = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = UpdateSourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await session.supabase
    .from('scraper_sources')
    .select('slug, implementation_status, enabled')
    .eq('slug', slug)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const implementationStatus = existing.implementation_status as 'live' | 'coming_soon';
  const nextEnabled = parsed.data.enabled ?? existing.enabled;

  if (!canEnableSource(implementationStatus, parsed.data.enabled)) {
    return NextResponse.json({ error: '该数据源尚未接入，无法启用' }, { status: 422 });
  }

  const { data, error } = await session.supabase
    .from('scraper_sources')
    .update({
      ...parsed.data,
      enabled: nextEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)
    .select(
      'slug, display_name, implementation_status, enabled, interval_minutes, anti_block_preset',
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ source: data });
}
