'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type DetailPhotoGalleryProps = {
  photos: string[];
  alt: string;
  /** Overlay controls (back, share) sit above the gallery. */
  controls?: React.ReactNode;
};

export function DetailPhotoGallery({ photos, alt, controls }: DetailPhotoGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || photos.length <= 1) return;
    const width = el.clientWidth;
    if (width <= 0) return;
    const index = Math.round(el.scrollLeft / width);
    setActiveIndex(Math.min(Math.max(index, 0), photos.length - 1));
  }, [photos.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncIndexFromScroll, { passive: true });
    return () => el.removeEventListener('scroll', syncIndexFromScroll);
  }, [syncIndexFromScroll]);

  if (photos.length === 0) {
    return (
      <div className="relative aspect-square w-full bg-surface-container-low">
        <div className="flex h-full items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px]">image</span>
        </div>
        {controls}
      </div>
    );
  }

  return (
    <div className="relative bg-surface-container-low">
      <div
        ref={scrollRef}
        className={cn(
          'flex aspect-square w-full snap-x snap-mandatory overflow-x-auto',
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {photos.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative h-full w-full shrink-0 snap-center snap-always"
          >
            <Image
              src={url}
              alt={photos.length > 1 ? `${alt} — ${index + 1}/${photos.length}` : alt}
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {controls}

      {photos.length > 1 ? (
        <div
          className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5"
          aria-hidden
        >
          {photos.map((url, index) => (
            <span
              key={`dot-${url}-${index}`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                index === activeIndex
                  ? 'w-4 bg-surface-container-lowest'
                  : 'w-1.5 bg-surface-container-lowest/50',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
