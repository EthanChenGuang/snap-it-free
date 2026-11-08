import { FeaturedReviewClient } from '@/components/admin/FeaturedReviewClient';
import { getOperatorServiceClient } from '@/lib/admin/operator-access';
import { getPendingFeaturedCandidates } from '@/lib/featured/admin';
import { requireSupabaseEnv } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

export default async function AdminFeaturedPage() {
  let candidates: Awaited<ReturnType<typeof getPendingFeaturedCandidates>> = [];
  try {
    const { url } = requireSupabaseEnv();
    candidates = await getPendingFeaturedCandidates(getOperatorServiceClient(), url);
  } catch (err) {
    console.error('[featured] review page load failed:', err);
  }
  return <FeaturedReviewClient initialCandidates={candidates} />;
}
