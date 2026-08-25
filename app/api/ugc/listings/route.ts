import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { pickupFieldsForInsert, resolvePickupLocation } from '@/lib/geo/pickup-location';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createListingSchemaForUser } from '@/lib/ugc/schemas';
import { assertCanPost, RateLimitError } from '@/lib/ugc/rate-limit';
import { getMessages } from '@/messages';

const messages = getMessages('zh');

function contentHash(title: string, photoUrl: string, lat: number, lng: number): string {
  const payload = `${title}|${photoUrl}|${lat}|${lng}`;
  return createHash('sha256').update(payload).digest('hex');
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

  const parsed = createListingSchemaForUser(user.id).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, photoUrl, photoUrls, lat, lng, description, postCategory } = parsed.data;
  const pickup = resolvePickupLocation(lat, lng);
  const { city: citySlug, region } = pickupFieldsForInsert(pickup);
  const gallery =
    photoUrls && photoUrls.length > 0 ? photoUrls : [photoUrl];

  const supabase = await createClient();

  try {
    await assertCanPost(supabase, user.id);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: messages.post.rateLimitPost }, { status: 429 });
    }
    throw error;
  }

  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const hash = contentHash(title, photoUrl, lat, lng);

  const { error } = await supabase.from('listings').insert({
    id,
    source: 'ugc',
    external_id: id,
    title,
    photo_url: gallery[0]!,
    photo_urls: gallery,
    external_url: `/listing/${id}`,
    lat,
    lng,
    geom: `SRID=4326;POINT(${lng} ${lat})`,
    zone: null,
    city: citySlug,
    region,
    status: 'active',
    posted_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    content_hash: hash,
    owner_user_id: user.id,
    description: description ?? null,
    category: postCategory,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
