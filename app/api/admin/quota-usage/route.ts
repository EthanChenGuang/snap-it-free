import { NextResponse } from 'next/server';
import { collectQuotaUsageSnapshot } from '@/lib/admin/quota-usage';
import { requireOperatorSession } from '@/lib/admin/operator-route';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  try {
    const supabase = createServiceClient();
    const snapshot = await collectQuotaUsageSnapshot(supabase);
    return NextResponse.json({ snapshot }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quota snapshot failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
