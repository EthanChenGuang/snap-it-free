import { NextResponse } from 'next/server';
import { getSourceBySlug } from '@/lib/admin/queries';
import { getOperatorSession } from '@/lib/admin/require-operator';
import { ValidateTargetUrlsSchema } from '@/lib/admin/schemas';
import { validateTargetUrlList } from '@/lib/admin/url-test';

/** Large Vinted matrices probe serially — allow up to ~10 min. */
export const maxDuration = 600;

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await context.params;
  const source = await getSourceBySlug(slug);
  if (!source) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ValidateTargetUrlsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const report = await validateTargetUrlList(slug, parsed.data.urls.join('\n'), {
    probe: parsed.data.probe,
  });

  return NextResponse.json(report);
}
