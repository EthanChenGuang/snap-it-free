---
status: complete
completed: 2026-08-10
---

# Rubberband Scroll Lock Fix — Summary

## Completed

- Stop/cancel in-flight `animate()` on touchstart and before each stretch so `offsetY.set()` works on repeat pulls
- `onComplete` callback explicitly sets `offsetY` to 0 and clears animating flag
- Re-anchor `startY` when entering boundary stretch for continuous multi-gesture pulls
- Spring updated: `stiffness: 400`, `damping: 25`; pull resistance `0.35`

## Root Cause

Motion spring animation retained control of the motion value after the first release; subsequent touch handlers could not update `y`, leaving scroll locked.

## Files Changed

- `components/ui/RubberbandScroll.tsx`
