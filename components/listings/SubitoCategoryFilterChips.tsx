'use client';

import { Button } from '@/components/ui/button';
import {
  getSubitoCategoryLabel,
  SUBITO_CATEGORY_SLUGS,
  type SubitoCategoryFilter,
} from '@/lib/listings/subito-categories';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type SubitoCategoryFilterChipsProps = {
  selectedCategory: SubitoCategoryFilter;
  onCategoryChange: (category: SubitoCategoryFilter) => void;
  className?: string;
  /** Map panel wraps chips with Categoria label and frosted container. */
  variant?: 'inline' | 'panel';
};

const ALL_SLUGS: SubitoCategoryFilter[] = ['all', ...SUBITO_CATEGORY_SLUGS];

/** Stitch D-30 — 18 chips (Tutte + 17 Subito slugs), shared map + Elenco. */
export function SubitoCategoryFilterChips({
  selectedCategory,
  onCategoryChange,
  className,
  variant = 'inline',
}: SubitoCategoryFilterChipsProps) {
  const { language, messages } = useMessages();

  const chipRow = (
    <div
      className={cn(
        'flex gap-space-sm overflow-x-auto no-scrollbar pb-space-xs',
        variant === 'panel' &&
          '[mask-image:linear-gradient(to_right,black_80%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_80%,transparent_100%)]',
        className,
      )}
    >
      {ALL_SLUGS.map((slug) => {
        const isActive = selectedCategory === slug;
        return (
          <Button
            key={slug}
            type="button"
            variant={isActive ? 'chipActive' : 'chip'}
            size="sm"
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-space-md py-1.5',
              variant === 'panel' && !isActive && 'border-transparent bg-surface-container-high hover:bg-surface-variant',
            )}
            onClick={() => onCategoryChange(slug)}
          >
            {getSubitoCategoryLabel(slug, language, { messages }) ?? slug}
          </Button>
        );
      })}
    </div>
  );

  if (variant === 'panel') {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface/80 p-space-sm backdrop-blur-md">
        <span className="mb-2 block text-label-sm uppercase tracking-wide text-secondary">
          Categoria
        </span>
        {chipRow}
      </div>
    );
  }

  return chipRow;
}
