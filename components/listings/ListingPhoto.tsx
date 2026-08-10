'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type ListingPhotoProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  sizes?: string;
};

export function ListingPhoto({
  src,
  alt,
  className,
  fallbackClassName,
  sizes = '400px',
}: ListingPhotoProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
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
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={cn('object-cover', className)}
      onError={() => setFailed(true)}
    />
  );
}
