import { NextResponse } from 'next/server';
import { requireOperatorSession } from '@/lib/admin/operator-route';
import { checkAndIncrementUsage } from '@/lib/admin/translation-cap';
import { translateListingFields } from '@/lib/admin/translate';
import { TranslationRetrySchema } from '@/lib/admin/schemas';
import { createServiceClient } from '@/lib/supabase/service';

type ListingRow = {
  id: string;
  title: string;
  category: string | null;
  raw_payload: Record<string, unknown> | null;
};

function descriptionFromPayload(rawPayload: Record<string, unknown> | null): string | null {
  if (rawPayload && typeof rawPayload.description === 'string') {
    return rawPayload.description;
  }
  return null;
}

async function retryListingTranslation(
  supabase: ReturnType<typeof createServiceClient>,
  listingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const usage = await checkAndIncrementUsage(supabase);
  if (!usage.allowed) {
    return { ok: false, error: 'Daily translation cap reached' };
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, title, category, raw_payload')
    .eq('id', listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return { ok: false, error: listingError?.message ?? 'Listing not found' };
  }

  const row = listing as ListingRow;
  const result = await translateListingFields(
    {
      title: row.title,
      description: descriptionFromPayload(row.raw_payload),
      category: row.category,
    },
    'gemini',
    {
      geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
      openRouterApiKey: process.env.OPENROUTER_API_KEY?.trim(),
      openRouterModel: process.env.OPENROUTER_FALLBACK_MODEL?.trim(),
    },
  );

  if (!result.ok) {
    const { data: existing } = await supabase
      .from('translation_queue')
      .select('attempts')
      .eq('listing_id', listingId)
      .maybeSingle();

    await supabase.from('translation_queue').upsert(
      {
        listing_id: listingId,
        status: 'failed',
        attempts: ((existing?.attempts as number | undefined) ?? 0) + 1,
        last_error: result.error,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'listing_id' },
    );

    return { ok: false, error: result.error };
  }

  const { translations } = result;
  const { error: updateError } = await supabase
    .from('listings')
    .update({
      title_en: translations.title_en,
      title_zh: translations.title_zh,
      description_en: translations.description_en,
      description_zh: translations.description_zh,
      category_en: translations.category_en,
      category_zh: translations.category_zh,
    })
    .eq('id', listingId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await supabase.from('translation_queue').delete().eq('listing_id', listingId);
  return { ok: true };
}

export async function POST(request: Request) {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = TranslationRetrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServiceClient();
  let listingIds = parsed.data.listing_ids ?? [];

  if (parsed.data.all_pending) {
    const { data, error } = await supabase
      .from('translation_queue')
      .select('listing_id')
      .in('status', ['pending', 'failed']);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    listingIds = (data ?? []).map((row) => row.listing_id as string);
  }

  const processed: string[] = [];
  const failures: Array<{ listingId: string; error: string }> = [];

  for (const listingId of listingIds) {
    const outcome = await retryListingTranslation(supabase, listingId);
    if (outcome.ok) {
      processed.push(listingId);
    } else {
      failures.push({ listingId, error: outcome.error });
    }
  }

  return NextResponse.json({ processed, failures });
}
