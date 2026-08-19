import { NextResponse } from 'next/server';
import { checkThresholdAlerts } from '@/lib/admin/threshold-alerts';
import { requireOperatorSession } from '@/lib/admin/operator-route';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST() {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  try {
    const supabase = createServiceClient();
    const result = await checkThresholdAlerts(supabase);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Threshold alert check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
