import { NextResponse, type NextRequest } from 'next/server';
import { hasOperatorAccessForUser } from '@/lib/admin/operator-access';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!supabase) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const allowed = await hasOperatorAccessForUser(supabase, user);
  if (!allowed) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
