import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { stripExif } from '@/lib/ugc/exif-strip';
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from '@/lib/ugc/schemas';

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('photo');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing photo' }, { status: 400 });
  }

  if (!ALLOWED_UPLOAD_MIME.includes(file.type as (typeof ALLOWED_UPLOAD_MIME)[number])) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const clean = await stripExif(inputBuffer);

  const supabase = await createClient();
  const path = `${user.id}/${randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('ugc-photos')
    .upload(path, clean, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('ugc-photos').getPublicUrl(path);

  return NextResponse.json({ photoUrl: publicUrl });
}
