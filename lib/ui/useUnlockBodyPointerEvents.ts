import { useEffect } from 'react';

/** Restore body pointer-events when vaul nonModal drawer leaves overlay disabled. */
export function useUnlockBodyPointerEvents(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const { body } = document;
    const previous = body.style.pointerEvents;
    body.style.pointerEvents = 'auto';
    return () => {
      body.style.pointerEvents = previous;
    };
  }, [enabled]);
}
