import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptProxy, type EncryptedProxyPayload } from '@/lib/admin/crypto';

function readProxyFromScraperEnv(): string | null {
  try {
    const contents = readFileSync(join(process.cwd(), 'scraper/.env'), 'utf-8');
    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('PROXY_URL=')) {
        const value = trimmed.slice('PROXY_URL='.length).trim();
        return value.length > 0 ? value : null;
      }
    }
  } catch {
    // scraper/.env optional
  }
  return null;
}

/** Resolve Subito proxy for admin-side HTTP fetches (matches scraper precedence). */
export async function resolveSubitoProxyUrl(supabase: SupabaseClient): Promise<string | null> {
  const fromProcess = process.env.PROXY_URL?.trim();
  if (fromProcess) {
    return fromProcess;
  }

  const secretsKey = process.env.SCRAPER_SECRETS_KEY?.trim();
  if (secretsKey) {
    const { data } = await supabase
      .from('scraper_global_config')
      .select('proxy_enc')
      .eq('id', 1)
      .maybeSingle();

    const proxyEnc = data?.proxy_enc as EncryptedProxyPayload | null | undefined;
    if (proxyEnc) {
      try {
        return decryptProxy(proxyEnc, secretsKey);
      } catch {
        // fall through to scraper/.env
      }
    }
  }

  return readProxyFromScraperEnv();
}
