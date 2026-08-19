export const TRANSLATION_QUEUE_PAGE_SIZE = 100;

export function parseTranslationQueuePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function translationQueueTotalPages(
  totalPending: number,
  pageSize = TRANSLATION_QUEUE_PAGE_SIZE,
): number {
  if (totalPending <= 0) {
    return 1;
  }
  return Math.ceil(totalPending / pageSize);
}

export function normalizeTranslationQueuePage(
  page: number,
  totalPending: number,
  pageSize = TRANSLATION_QUEUE_PAGE_SIZE,
): number {
  return Math.min(page, translationQueueTotalPages(totalPending, pageSize));
}

export function translationQueuePageHref(page: number): string {
  return page <= 1 ? '/admin/translation' : `/admin/translation?page=${page}`;
}

export function translationQueuePageRange(
  page: number,
  totalPending: number,
  pageSize = TRANSLATION_QUEUE_PAGE_SIZE,
): { from: number; to: number } {
  if (totalPending <= 0) {
    return { from: 0, to: 0 };
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalPending);
  return { from, to };
}
