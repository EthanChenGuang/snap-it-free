'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from '@/hooks/useInView';
import {
  normalizeSubitoFeedPhotoUrl,
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
  variant?: 'default' | 'thumbnail' | 'feed';
};

function PhotoPlaceholder({ className, shimmer = false }: { className?: string; shimmer?: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-0 bg-surface-container-high',
        shimmer ? 'feed-photo-shimmer' : 'animate-pulse',
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
  const imgRef = useRef<HTMLImageElement>(null);
  const inView = useInView(containerRef, { enabled: !priority });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const normalizePhotoUrl =
    variant === 'feed'
      ? normalizeSubitoFeedPhotoUrl
      : variant === 'thumbnail'
        ? normalizeSubitoThumbnailUrl
        : normalizeSubitoPhotoUrl;
  const resolvedSrc = src ? normalizePhotoUrl(src) : src;
  const shouldLoad = priority || inView;
  const isFeed = variant === 'feed';

  // Cached images (or a failed hydration pass) may finish loading before onLoad attaches.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [resolvedSrc, shouldLoad]);

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
      {(!shouldLoad || !loaded) && <PhotoPlaceholder shimmer={isFeed} />}
      {shouldLoad && (
        // Native img — external CDN already resizes; avoids Next/Image unoptimized overhead.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={resolvedSrc}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className={cn(
            'absolute inset-0 z-[1] h-full w-full object-cover',
            isFeed && 'feed-card-image',
            isFeed && (loaded ? 'feed-card-image-loaded' : 'feed-card-image-reveal'),
            !isFeed && 'transition-opacity duration-300',
            className,
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
