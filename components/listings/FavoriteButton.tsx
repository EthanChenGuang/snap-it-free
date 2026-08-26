'use client';

import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { cardOverlayGlassClass } from '@/components/listings/cardOverlayGlass';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { useFavorites } from '@/lib/favorites/useFavorites';
import { useMessages } from '@/lib/i18n/useMessages';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type FavoriteButtonProps = {
  listingId: string;
  className?: string;
  size?: 'sm' | 'default';
  tone?: 'default' | 'overlay';
};

export function FavoriteButton({
  listingId,
  className,
  size = 'default',
  tone = 'default',
}: FavoriteButtonProps) {
  const { messages } = useMessages();

  const pathname = usePathname();
  const { isFavorite, toggle, hydrated, isAuthed } = useFavorites();
  const [authOpen, setAuthOpen] = useState(false);
  const [shouldPop, setShouldPop] = useState(false);
  const prevFavoritedRef = useRef(false);
  const favorited = hydrated && isFavorite(listingId);

  useEffect(() => {
    if (hydrated && favorited && !prevFavoritedRef.current) {
      setShouldPop(true);
    }
    prevFavoritedRef.current = favorited;
  }, [favorited, hydrated]);

  useEffect(() => {
    if (!shouldPop) return;
    const timer = window.setTimeout(() => setShouldPop(false), 400);
    return () => window.clearTimeout(timer);
  }, [shouldPop]);

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (getSupabaseEnv() && !isAuthed) {
      setAuthOpen(true);
      return;
    }

    const added = await toggle(listingId);
    toast(added ? messages.favorites.added : messages.favorites.removed);
  };

  const redirectTo = pathname.startsWith('/favorites') ? '/favorites' : pathname;

  const isOverlay = tone === 'overlay';
  const iconOpsz = isOverlay && size === 'sm' ? 20 : 24;

  const heartIcon = (
    <motion.span
      className={cn(
        'material-symbols-outlined leading-none',
        isOverlay ? 'size-4 text-body-md' : size === 'sm' ? 'text-body-lg' : 'text-h3',
        favorited
          ? 'text-accent-orange'
          : isOverlay
            ? 'text-zinc-700 dark:text-zinc-200'
            : 'text-on-surface-variant',
      )}
      style={{
        fontVariationSettings: favorited
          ? `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' ${iconOpsz}`
          : `'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' ${iconOpsz}`,
      }}
      whileTap={{ scale: 0.8 }}
      animate={shouldPop ? { scale: [1, 1.28, 1] } : { scale: 1 }}
      transition={
        shouldPop
          ? { duration: 0.32, ease: [0.16, 1, 0.3, 1] }
          : { type: 'spring', stiffness: 420, damping: 28 }
      }
    >
      favorite
    </motion.span>
  );

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size === 'sm' ? 'sm' : 'icon'}
        onClick={handleClick}
        aria-label={messages.detail.favorite}
        aria-pressed={favorited}
        className={cn(
          'shrink-0',
          isOverlay &&
            'relative flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border-0 bg-transparent p-0 shadow-none hover:bg-transparent',
          className,
        )}
      >
        {isOverlay ? (
          <span
            aria-hidden
            className={cn(
              'flex h-8 w-8 items-center justify-center',
              cardOverlayGlassClass,
            )}
          >
            {heartIcon}
          </span>
        ) : (
          heartIcon
        )}
      </Button>
      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo={redirectTo}
        modalTitle={messages.auth.favoriteTitle}
      />
    </>
  );
}
