import { TranslationQueueClient } from '@/components/admin/TranslationQueueClient';
import { getTranslationQueue } from '@/lib/admin/queries';

export default async function AdminTranslationPage() {
  const items = await getTranslationQueue();
  return <TranslationQueueClient initialItems={items} />;
}
