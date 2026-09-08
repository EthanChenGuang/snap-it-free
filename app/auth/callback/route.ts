import { NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/auth/safe-next-path';
import { createClient } from '@/lib/supabase/server';

function authErrorRedirect(origin: string, next: string, providerError?: string | null) {
  const params = new URLSearchParams({ auth: 'error' });
  if (providerError) {
    params.set('provider', providerError);
  }
  return NextResponse.redirect(`${origin}${next}?${params.toString()}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));
  const oauthError = searchParams.get('error');
  const oauthErrorDescription = searchParams.get('error_description');

  if (oauthError) {
    console.error('[auth/callback] OAuth provider error:', oauthError, oauthErrorDescription);
    return authErrorRedirect(origin, next, oauthError);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
  } else {
    console.error('[auth/callback] missing code param');
  }

  return authErrorRedirect(origin, next);
}
