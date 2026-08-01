'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { useFavorites } from '@/lib/favorites/useFavorites';
import { createClient } from '@/lib/supabase/client';
import { messages } from '@/messages/it';
import { cn } from '@/lib/utils';

type FavoriteButtonProps = {
  listingId: string;
  className?: string;
  size?: 'sm' | 'default';
};

export function FavoriteButton({ listingId, className, size = 'default' }: FavoriteButtonProps) {
  const pathname = usePathname();
  const { isFavorite, toggle, hydrated } = useFavorites();
  const [authOpen, setAuthOpen] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const favorited = hydrated && isFavorite(listingId);

  useEffect(() => {
    const supabase = createClient();

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setHasSession(Boolean(session));
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (hasSession === false) {
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
      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo={redirectTo}
        modalTitle={messages.auth.favoriteTitle}
      />
    </>
  );
}
