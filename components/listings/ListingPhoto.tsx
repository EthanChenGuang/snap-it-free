'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useInView } from '@/hooks/useInView';
import {
  normalizeSubitoPhotoUrl,
  normalizeSubitoThumbnailUrl,
} from '@/lib/listings/subito-photo-url';
import { cn } from '@/lib/utils';

type ListingPhotoProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  sizes?: string;
  /** Eager-load for above-the-fold cards (first screen). */
  priority?: boolean;
  /** List cards use a smaller Subito CDN preset; detail/hero keeps the gallery rule. */
  variant?: 'default' | 'thumbnail';
};

function PhotoPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'absolute inset-0 animate-pulse bg-surface-container-high',
        className,
      )}
      aria-hidden
    />
  );
}

export function ListingPhoto({
  src,
  alt,
  className,
  fallbackClassName,
  sizes = '400px',
  priority = false,
  variant = 'default',
}: ListingPhotoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { enabled: !priority });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const normalizePhotoUrl =
    variant === 'thumbnail' ? normalizeSubitoThumbnailUrl : normalizeSubitoPhotoUrl;
  const resolvedSrc = src ? normalizePhotoUrl(src) : src;
  const shouldLoad = priority || inView;

  if (!resolvedSrc || failed) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-surface-container-high text-on-surface-variant',
          fallbackClassName,
        )}
      >
        <span className="material-symbols-outlined">image</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {(!shouldLoad || !loaded) && <PhotoPlaceholder />}
      {shouldLoad && (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized
          className={cn(
            'object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
            className,
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
