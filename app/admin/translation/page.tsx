import { TranslationQueueClient } from '@/components/admin/TranslationQueueClient';
import {
  getPendingTranslationCount,
  getTranslationCostSummary,
  getTranslationQueue,
} from '@/lib/admin/queries';

export default async function AdminTranslationPage() {
  const [items, totalPending, costSummary] = await Promise.all([
    getTranslationQueue(),
    getPendingTranslationCount(),
    getTranslationCostSummary(),
  ]);
  return (
    <TranslationQueueClient
      initialItems={items}
      totalPending={totalPending}
      initialCostSummary={costSummary}
    />
  );
}
