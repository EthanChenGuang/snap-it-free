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

  const stopBubble = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    stopBubble(event);

    if (getSupabaseEnv() && !isAuthed) {
      setAuthOpen(true);
      return;
    }

    const added = await toggle(listingId);
    toast(added ? messages.favorites.added : messages.favorites.removed);
  };

  const redirectTo = pathname.startsWith('/favorites') ? '/favorites' : pathname;

  const isOverlay = tone === 'overlay';
  const iconOpsz = isOverlay ? 20 : size === 'sm' ? 20 : 24;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size === 'sm' ? 'sm' : 'icon'}
        onPointerDown={stopBubble}
        onClick={handleClick}
        aria-label={messages.detail.favorite}
        aria-pressed={favorited}
        className={cn(
          'shrink-0',
          isOverlay &&
            'flex h-10 w-10 touch-manipulation items-center justify-center border-0 bg-transparent p-0 shadow-none hover:bg-transparent',
          className,
        )}
      >
        <motion.span
          className={cn(
            'material-symbols-outlined leading-none',
            isOverlay ? 'size-5' : size === 'sm' ? 'text-body-lg' : 'text-h3',
            favorited
              ? cn(
                  'text-accent-orange',
                  isOverlay && 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]',
                )
              : isOverlay
                ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
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
