import { redirect } from 'next/navigation';
import { TranslationQueueClient } from '@/components/admin/TranslationQueueClient';
import {
  getPendingTranslationCount,
  getTranslationCostSummary,
  getTranslationQueue,
} from '@/lib/admin/queries';
import {
  TRANSLATION_QUEUE_PAGE_SIZE,
  normalizeTranslationQueuePage,
  parseTranslationQueuePage,
  translationQueuePageHref,
} from '@/lib/admin/translation-queue-pagination';

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminTranslationPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const requestedPage = parseTranslationQueuePage(pageParam);

  const [totalPending, costSummary] = await Promise.all([
    getPendingTranslationCount(),
    getTranslationCostSummary(),
  ]);

  const page = normalizeTranslationQueuePage(requestedPage, totalPending);
  if (page !== requestedPage) {
    redirect(translationQueuePageHref(page));
  }

  const items = await getTranslationQueue({ page, pageSize: TRANSLATION_QUEUE_PAGE_SIZE });

  return (
    <TranslationQueueClient
      initialItems={items}
      totalPending={totalPending}
      initialCostSummary={costSummary}
      page={page}
      pageSize={TRANSLATION_QUEUE_PAGE_SIZE}
    />
  );
}
