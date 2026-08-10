# Quick Task: Rubberband Scroll Lock Fix

Fix repeating overscroll/bounce lock on feed and favorites after first boundary pull.

## Tasks

1. **Stop in-flight animations** on touchstart and before new stretch so Motion releases control of `offsetY`
2. **Reset gesture state** via refs (`isStretching`, `isAnimating`) and `onComplete` → `offsetY.set(0)`
3. **Re-anchor pull origin** when entering boundary stretch so repeated pulls compute fresh delta
4. **Update spring** to stiffness 400, damping 25; resistance 0.35
