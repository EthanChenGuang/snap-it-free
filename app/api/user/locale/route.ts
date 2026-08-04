import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { isValidAppLanguage, syncUserLocale } from '@/lib/user/locale';

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

  const language =
    body && typeof body === 'object' && 'language' in body
      ? (body as { language: unknown }).language
      : undefined;

  if (!isValidAppLanguage(language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await syncUserLocale(supabase, user.id, language);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, language });
}
