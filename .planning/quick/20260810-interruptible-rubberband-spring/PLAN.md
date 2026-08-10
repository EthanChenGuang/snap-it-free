# Quick Task: Interruptible Rubberband Spring

Fix repeat touch freeze and make spring overscroll interruptible in RubberbandScroll.

## Tasks

1. **touchstart** — `controls.stop()` + `offsetY.stop()`, reset `startY`, capture `stretchBase`, recalculate boundary refs
2. **touchmove** — dynamic `scrollTop === 0` / bottom checks; resistance from stretch base; `preventDefault` only when clamped !== 0
3. **touchend/cancel** — spring release + full gesture reset in callback and on release
