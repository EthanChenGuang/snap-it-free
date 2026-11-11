import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CONTACT_TRANSLATE_DAILY_LIMIT, translateContactText } from '@/lib/contact/translate';
import { isPaywallFlagEnabled } from '@/lib/paywall/gate';
import { getSubscriptionActive } from '@/lib/paywall/server-access';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

const BodySchema = z.object({
  mode: z.enum(['reply', 'compose']),
  text: z.string().trim().min(1).max(1000),
  language: z.enum(['zh', 'en']),
});

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isPaywallFlagEnabled() && !(await getSubscriptionActive())) {
    return NextResponse.json({ error: 'subscription_required' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: withinLimit, error: usageError } = await supabase.rpc('bump_contact_translation', {
    p_limit: CONTACT_TRANSLATE_DAILY_LIMIT,
  });
  if (usageError) {
    // Fail open: a missing migration must not break the feature; a call costs a fraction of a cent.
    console.error('[contact] usage check failed:', usageError.message);
  } else if (withinLimit === false) {
    return NextResponse.json({ error: 'daily_limit' }, { status: 429 });
  }

  const outcome = await translateContactText(parsed.data, { apiKey });
  if (!outcome.ok) {
    console.error('[contact] translate failed:', outcome.error);
    return NextResponse.json({ error: 'translation_failed' }, { status: 502 });
  }
  return NextResponse.json(outcome.result);
}
