'use client';

import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
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
            'h-9 w-9 rounded-full border border-white/25 bg-black/20 p-0 shadow-none backdrop-blur-md hover:bg-black/30 dark:border-white/15 dark:bg-white/20 dark:hover:bg-white/30',
          className,
        )}
      >
        <motion.span
          className={cn(
            'material-symbols-outlined',
            size === 'sm' ? 'text-body-lg' : 'text-h3',
            favorited
              ? 'text-accent-orange'
              : isOverlay
                ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]'
                : 'text-on-surface-variant',
          )}
          style={{
            fontVariationSettings: favorited
              ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
              : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
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
