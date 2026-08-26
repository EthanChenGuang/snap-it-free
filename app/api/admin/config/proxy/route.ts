import { NextResponse } from 'next/server';
import { decryptProxy, type EncryptedProxyPayload } from '@/lib/admin/crypto';
import { getOperatorSession } from '@/lib/admin/require-operator';

export async function GET() {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const secretsKey = process.env.SCRAPER_SECRETS_KEY?.trim();
  if (!secretsKey) {
    return NextResponse.json({ error: 'SCRAPER_SECRETS_KEY not configured' }, { status: 500 });
  }

  const { data, error } = await session.supabase
    .from('scraper_global_config')
    .select('proxy_enc')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const proxyEnc = data?.proxy_enc as EncryptedProxyPayload | null | undefined;
  if (!proxyEnc) {
    return NextResponse.json({ error: 'Proxy not configured' }, { status: 404 });
  }

  try {
    const proxyUrl = decryptProxy(proxyEnc, secretsKey);
    return NextResponse.json({ proxy_url: proxyUrl });
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt proxy URL' }, { status: 500 });
  }
}
