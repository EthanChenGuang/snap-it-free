import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);

  if (!user?.email) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/post';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', '/admin');
    return NextResponse.redirect(loginUrl);
  }

  if (!supabase) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const { data, error } = await supabase
    .from('operator_allowlist')
    .select('email')
    .ilike('email', user.email.trim())
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
