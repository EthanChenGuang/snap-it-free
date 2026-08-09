'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type FeedScrollContextValue = {
  headerHidden: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  registerScrollContainer: (element: HTMLElement | null) => void;
};

const FeedScrollContext = createContext<FeedScrollContextValue | null>(null);

const SCROLL_THRESHOLD_PX = 8;

/** Bridges feed scroll container and header scroll-away state (D-08). */
export function FeedScrollProvider({ children }: { children: ReactNode }) {
  const [headerHidden, setHeaderHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const lastScrollTopRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const registerScrollContainer = useCallback((element: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    lastScrollTopRef.current = 0;
    setHeaderHidden(false);

    if (!element) return;

    const handleScroll = () => {
      const scrollTop = element.scrollTop;
      const delta = scrollTop - lastScrollTopRef.current;

      if (Math.abs(delta) >= SCROLL_THRESHOLD_PX) {
        if (delta > 0 && scrollTop > 0) {
          setHeaderHidden(true);
        } else if (delta < 0) {
          setHeaderHidden(false);
        }
        lastScrollTopRef.current = scrollTop;
      }
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    cleanupRef.current = () => element.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <FeedScrollContext.Provider
      value={{ headerHidden, searchQuery, setSearchQuery, registerScrollContainer }}
    >
      {children}
    </FeedScrollContext.Provider>
  );
}

export function useFeedScroll(): FeedScrollContextValue {
  const context = useContext(FeedScrollContext);
  if (!context) {
    throw new Error('useFeedScroll must be used within FeedScrollProvider');
  }
  return context;
}
