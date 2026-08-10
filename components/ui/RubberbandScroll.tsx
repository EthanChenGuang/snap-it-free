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

function clampOffset(value: number): number {
  return Math.max(-MAX_STRETCH_PX, Math.min(MAX_STRETCH_PX, value));
}

type RubberbandScrollProps = ComponentPropsWithoutRef<'div'> & {
  children: ReactNode;
};

export const RubberbandScroll = forwardRef<HTMLDivElement, RubberbandScrollProps>(
  function RubberbandScroll({ className, children, ...rest }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const offsetY = useMotionValue(0);
    const animationRef = useRef<ReturnType<typeof animate> | null>(null);
    const startYRef = useRef(0);
    const stretchBaseRef = useRef(0);
    const isDraggingRef = useRef(false);
    const isAtTopRef = useRef(false);
    const isAtBottomRef = useRef(false);
    const isAnimatingRef = useRef(false);
    const [springEnabled, setSpringEnabled] = useState(false);

    useImperativeHandle(ref, () => scrollRef.current as HTMLDivElement);

    useEffect(() => {
      setSpringEnabled(!prefersNativeOverscroll());
    }, []);

    useEffect(() => {
      const el = scrollRef.current;
      if (!el || !springEnabled) return;

      const readBoundaries = () => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const atTop = scrollTop === 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        isAtTopRef.current = atTop;
        isAtBottomRef.current = atBottom;
        return { atTop, atBottom };
      };

      const resetGestureState = () => {
        isDraggingRef.current = false;
        isAtTopRef.current = false;
        isAtBottomRef.current = false;
      };

      const stopAnimation = () => {
        animationRef.current?.stop();
        animationRef.current = null;
        offsetY.stop();
        isAnimatingRef.current = false;
      };

      const resetToNeutral = () => {
        stopAnimation();
        offsetY.set(0);
        resetGestureState();
      };

      const springBack = () => {
        const current = offsetY.get();
        if (Math.abs(current) < 0.5) {
          resetToNeutral();
          return;
        }

        stopAnimation();
        resetGestureState();
        isAnimatingRef.current = true;

        animationRef.current = animate(offsetY, 0, {
          ...RUBBERBAND_SPRING,
          onComplete: () => {
            offsetY.set(0);
            isAnimatingRef.current = false;
            animationRef.current = null;
            resetGestureState();
          },
        });
      };

      const onTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;

        stopAnimation();

        const clientY = event.touches[0].clientY;
        startYRef.current = clientY;
        stretchBaseRef.current = offsetY.get();
        isDraggingRef.current = false;
        readBoundaries();
      };

      const onTouchMove = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;

        if (isAnimatingRef.current) {
          stopAnimation();
        }

        const { atTop, atBottom } = readBoundaries();
        const clientY = event.touches[0].clientY;
        const deltaY = clientY - startYRef.current;

        const pullTop =
          atTop && (deltaY > 0 || offsetY.get() > 0 || stretchBaseRef.current > 0);
        const pullBottom =
          atBottom && (deltaY < 0 || offsetY.get() < 0 || stretchBaseRef.current < 0);

        if (pullTop || pullBottom) {
          if (!isDraggingRef.current) {
            stretchBaseRef.current = offsetY.get();
            startYRef.current = clientY;
            isDraggingRef.current = true;
          }

          const raw = stretchBaseRef.current + (clientY - startYRef.current) * PULL_RESISTANCE;
          const clamped = clampOffset(raw);
          offsetY.set(clamped);

          if (clamped !== 0) {
            event.preventDefault();
          }
          return;
        }

        if (isDraggingRef.current) {
          offsetY.set(0);
          isDraggingRef.current = false;
          stretchBaseRef.current = 0;
        }
      };

      const onTouchEnd = () => {
        if (isDraggingRef.current || Math.abs(offsetY.get()) >= 0.5) {
          isDraggingRef.current = false;
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
        resetToNeutral();
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
