import { NextResponse, type NextRequest } from 'next/server';
import { hasOperatorAccess } from '@/lib/admin/operator-access';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);

  if (!user?.email) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!supabase) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const allowed = await hasOperatorAccess(supabase, user.email);
  if (!allowed) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
