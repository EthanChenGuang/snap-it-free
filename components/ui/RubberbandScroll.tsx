'use client';

import { animate, motion, useMotionValue } from 'motion/react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

const RUBBERBAND_SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };
const MAX_STRETCH_PX = 88;
const PULL_RESISTANCE = 0.42;

function prefersNativeOverscroll(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

type RubberbandScrollProps = ComponentPropsWithoutRef<'div'> & {
  children: ReactNode;
};

export const RubberbandScroll = forwardRef<HTMLDivElement, RubberbandScrollProps>(
  function RubberbandScroll({ className, children, ...rest }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const offsetY = useMotionValue(0);
    const [springEnabled, setSpringEnabled] = useState(false);

    useImperativeHandle(ref, () => scrollRef.current as HTMLDivElement);

    useEffect(() => {
      setSpringEnabled(!prefersNativeOverscroll());
    }, []);

    useEffect(() => {
      const el = scrollRef.current;
      if (!el || !springEnabled) return;

      let startY = 0;
      let stretching = false;

      const resetStretch = () => {
        stretching = false;
        animate(offsetY, 0, RUBBERBAND_SPRING);
      };

      const onTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;
        startY = event.touches[0].clientY;
        stretching = false;
      };

      const onTouchMove = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;

        const { scrollTop, scrollHeight, clientHeight } = el;
        const atTop = scrollTop <= 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        const deltaY = event.touches[0].clientY - startY;

        const pullTop = atTop && deltaY > 0;
        const pullBottom = atBottom && deltaY < 0;

        if (pullTop || pullBottom) {
          stretching = true;
          const raw = deltaY * PULL_RESISTANCE;
          const clamped = Math.max(-MAX_STRETCH_PX, Math.min(MAX_STRETCH_PX, raw));
          offsetY.set(clamped);
          if (Math.abs(clamped) > 2) {
            event.preventDefault();
          }
          return;
        }

        if (stretching) {
          offsetY.set(0);
          stretching = false;
        }
      };

      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', resetStretch);
      el.addEventListener('touchcancel', resetStretch);

      return () => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', resetStretch);
        el.removeEventListener('touchcancel', resetStretch);
      };
    }, [offsetY, springEnabled]);

    return (
      <div ref={scrollRef} className={cn('rubberband-scroll', className)} {...rest}>
        {springEnabled ? (
          <motion.div className="min-h-full will-change-transform" style={{ y: offsetY }}>
            {children}
          </motion.div>
        ) : (
          children
        )}
      </div>
    );
  },
);
