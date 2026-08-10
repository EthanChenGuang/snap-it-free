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

const RUBBERBAND_SPRING = { type: 'spring' as const, stiffness: 400, damping: 25 };
const MAX_STRETCH_PX = 88;
const PULL_RESISTANCE = 0.35;

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
    const animationRef = useRef<ReturnType<typeof animate> | null>(null);
    const isStretchingRef = useRef(false);
    const isAnimatingRef = useRef(false);
    const startYRef = useRef(0);
    const [springEnabled, setSpringEnabled] = useState(false);

    useImperativeHandle(ref, () => scrollRef.current as HTMLDivElement);

    useEffect(() => {
      setSpringEnabled(!prefersNativeOverscroll());
    }, []);

    useEffect(() => {
      const el = scrollRef.current;
      if (!el || !springEnabled) return;

      const stopAnimation = () => {
        animationRef.current?.stop();
        animationRef.current = null;
        isAnimatingRef.current = false;
      };

      const resetToNeutral = () => {
        stopAnimation();
        offsetY.set(0);
        isStretchingRef.current = false;
      };

      const springBack = () => {
        stopAnimation();
        isStretchingRef.current = false;
        isAnimatingRef.current = true;

        animationRef.current = animate(offsetY, 0, {
          ...RUBBERBAND_SPRING,
          onComplete: () => {
            offsetY.set(0);
            isAnimatingRef.current = false;
            animationRef.current = null;
          },
        });
      };

      const onTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;

        stopAnimation();
        isStretchingRef.current = false;
        startYRef.current = event.touches[0].clientY;
      };

      const onTouchMove = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;

        if (isAnimatingRef.current) {
          stopAnimation();
        }

        const { scrollTop, scrollHeight, clientHeight } = el;
        const atTop = scrollTop <= 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        const clientY = event.touches[0].clientY;
        const deltaY = clientY - startYRef.current;

        const pullTop = atTop && deltaY > 0;
        const pullBottom = atBottom && deltaY < 0;

        if (pullTop || pullBottom) {
          if (!isStretchingRef.current) {
            startYRef.current = clientY;
            isStretchingRef.current = true;
          }

          const raw = (clientY - startYRef.current) * PULL_RESISTANCE;
          const clamped = Math.max(-MAX_STRETCH_PX, Math.min(MAX_STRETCH_PX, raw));
          offsetY.set(clamped);

          if (Math.abs(clamped) > 2) {
            event.preventDefault();
          }
          return;
        }

        if (isStretchingRef.current) {
          offsetY.set(0);
          isStretchingRef.current = false;
        }
      };

      const onTouchEnd = () => {
        if (isStretchingRef.current || offsetY.get() !== 0) {
          springBack();
          return;
        }
        resetToNeutral();
      };

      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd);
      el.addEventListener('touchcancel', onTouchEnd);

      return () => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchEnd);
        stopAnimation();
        offsetY.set(0);
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
