'use client';

import { useEffect, useState, type RefObject } from 'react';

type UseInViewOptions = {
  /** Load slightly before the element enters the viewport. */
  rootMargin?: string;
  threshold?: number;
  /** When true, skip observation and report in-view immediately. */
  enabled?: boolean;
};

/**
 * Returns whether `ref` is intersecting the viewport (or scroll root).
 * Disconnects after first intersection so images stay mounted once loaded.
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin = '480px 0px', threshold = 0.01, enabled = true }: UseInViewOptions = {},
): boolean {
  const [inView, setInView] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setInView(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, rootMargin, threshold, ref]);

  return inView;
}
