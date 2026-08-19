import { NextResponse } from 'next/server';
import { collectPlatformUsageSnapshot } from '@/lib/admin/platform-usage';
import { evaluateThresholds } from '@/lib/admin/threshold-alerts';
import { requireOperatorSession } from '@/lib/admin/operator-route';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  const session = await requireOperatorSession();
  if ('error' in session) {
    return session.error;
  }

  try {
    const supabase = createServiceClient();
    const snapshot = await collectPlatformUsageSnapshot(supabase);
    const alerts = evaluateThresholds(snapshot);

    return NextResponse.json(
      { snapshot, alerts, thresholds: { supabaseDbPercent: 80, translationMonthlyUsd: 10, proxyBlockRatePercent: 20 } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Platform usage snapshot failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
