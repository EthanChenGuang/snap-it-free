import { NextResponse } from 'next/server';
import { getSourceBySlug } from '@/lib/admin/queries';
import { canEnableSource, getOperatorSession } from '@/lib/admin/require-operator';
import { UpdateSourceSchema } from '@/lib/admin/schemas';
import { validateTargetUrls } from '@/lib/admin/url-validate';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await context.params;
  const source = await getSourceBySlug(slug);
  if (!source) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ source });
}

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

  if (parsed.data.target_urls != null) {
    const urlCheck = validateTargetUrls(slug, parsed.data.target_urls);
    if (!urlCheck.ok) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 });
    }
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
      'slug, display_name, implementation_status, enabled, interval_minutes, anti_block_preset, target_urls',
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    source: {
      slug: data.slug,
      displayName: data.display_name,
      implementationStatus: data.implementation_status,
      enabled: data.enabled,
      intervalMinutes: data.interval_minutes,
      antiBlockPreset: data.anti_block_preset,
      targetUrls: data.target_urls ?? [],
    },
  });
}
