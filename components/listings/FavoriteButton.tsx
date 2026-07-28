'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { useFavorites } from '@/lib/favorites/useFavorites';
import { messages } from '@/messages/it';
import { cn } from '@/lib/utils';

type FavoriteButtonProps = {
  listingId: string;
  className?: string;
  size?: 'sm' | 'default';
};

export function FavoriteButton({ listingId, className, size = 'default' }: FavoriteButtonProps) {
  const { isFavorite, toggle, hydrated } = useFavorites();
  const favorited = hydrated && isFavorite(listingId);

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const added = toggle(listingId);
    toast(added ? messages.favorites.added : messages.favorites.removed);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === 'sm' ? 'sm' : 'icon'}
      onClick={handleClick}
      aria-label={messages.detail.favorite}
      aria-pressed={favorited}
      className={cn('shrink-0', className)}
    >
      <span
        className={cn(
          'material-symbols-outlined',
          favorited ? 'text-accent-orange' : 'text-on-surface-variant',
        )}
        style={{
          fontVariationSettings: favorited ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
        }}
      >
        favorite
      </span>
    </Button>
  );
}
