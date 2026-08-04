'use client';

import { Button } from '@/components/ui/button';
import { LISTING_CATEGORIES, type ListingCategory } from '@/lib/listings/categories';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type CategoryFilterChipsProps = {
  selectedCategory: ListingCategory;
  onCategoryChange: (category: ListingCategory) => void;
  className?: string;
};

/** Stitch listing_feed category pills — All active black, others white + border. */
export function CategoryFilterChips({
  selectedCategory,
  onCategoryChange,
  className,
}: CategoryFilterChipsProps) {
  const { categoryLabel } = useMessages();

  return (
    <div className={cn('flex gap-space-sm overflow-x-auto no-scrollbar pb-space-xs', className)}>
      {LISTING_CATEGORIES.map((category) => {
        const isActive = selectedCategory === category;
        return (
          <Button
            key={category}
            type="button"
            variant={isActive ? 'chipActive' : 'chip'}
            size="sm"
            className="shrink-0 whitespace-nowrap rounded-full px-space-md py-1.5"
            onClick={() => onCategoryChange(category)}
          >
            {categoryLabel(category)}
          </Button>
        );
      })}
    </div>
  );
}
