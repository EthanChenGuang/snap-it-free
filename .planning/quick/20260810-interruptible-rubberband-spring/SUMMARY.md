---
status: complete
completed: 2026-08-10
---

# Interruptible Rubberband Spring — Summary

## Completed

- `touchstart` stops active animation via `controls.stop()` and `offsetY.stop()`, preserves current stretch via `stretchBaseRef` for seamless mid-spring grabs
- Boundary refs (`isAtTop`, `isAtBottom`) recalculated on every touchstart/touchmove using `scrollTop === 0` and bottom threshold
- `touchmove` computes displacement from stretch base + resisted delta; `preventDefault` only when clamped offset is non-zero
- `touchend`/`touchcancel` spring to 0 (stiffness 400, damping 25) and reset all gesture flags in `onComplete`

## Files Changed

- `components/ui/RubberbandScroll.tsx`
