import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { pickupFieldsForInsert, resolvePickupLocation } from '@/lib/geo/pickup-location';
import { requireAuth } from '@/lib/supabase/auth';
import {
  countRecentUgcPosts,
  insertUgcListing,
  isUgcRateLimitDbError,
} from '@/lib/ugc/insert-listing';
import { createListingSchemaForUser } from '@/lib/ugc/schemas';
import { getMessages } from '@/messages';

const messages = getMessages('zh');
const POST_LIMIT = 3;

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

  try {
    const recent = await countRecentUgcPosts(user.id);
    if (recent >= POST_LIMIT) {
      return NextResponse.json({ error: messages.post.rateLimitPost }, { status: 429 });
    }

    const id = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await insertUgcListing({
      id,
      title,
      photoUrl: gallery[0]!,
      photoUrls: gallery,
      lat,
      lng,
      city: citySlug,
      region,
      description: description ?? null,
      category: postCategory,
      ownerUserId: user.id,
      contentHash: contentHash(title, photoUrl, lat, lng),
      postedAt: now,
      expiresAt,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (isUgcRateLimitDbError(error)) {
      return NextResponse.json({ error: messages.post.rateLimitPost }, { status: 429 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
