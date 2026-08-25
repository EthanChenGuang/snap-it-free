'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { useFavorites } from '@/lib/favorites/useFavorites';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

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

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size === 'sm' ? 'sm' : 'icon'}
        onClick={handleClick}
        aria-label={messages.detail.favorite}
        aria-pressed={favorited}
        className={cn('shrink-0', className)}
      >
        <motion.span
          className={cn(
            'material-symbols-outlined text-[22px]',
            favorited
              ? 'text-accent-orange'
              : tone === 'overlay'
                ? 'text-primary'
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
              ? { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }
              : { type: 'spring', stiffness: 500, damping: 20 }
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
