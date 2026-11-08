"""Quality gate: decide whether a studio cutout is safe to propose.

Pure heuristics on the alpha mask of the ORIGINAL full-frame photo, no extra model calls.
Fails closed: anything that might carry the Subito watermark is rejected.
"""
from __future__ import annotations

import numpy as np
import cv2

COVERAGE_MIN, COVERAGE_MAX = 0.08, 0.80
WATERMARK_ZONE = (0.88, 0.80)  # bottom 12 %, right 20 %
WATERMARK_MAX_OBJECT = 0.02
FRAME_TOUCH_MAX = 0.25
FRAGMENT_MAX = 0.15
SOLIDITY_MIN = 0.45


def check(mask: np.ndarray) -> list[str]:
    """Return failure reasons; empty list means pass."""
    h, w = mask.shape
    m = mask > 127
    cov = float(m.mean())
    reasons: list[str] = []
    if not COVERAGE_MIN <= cov <= COVERAGE_MAX:
        reasons.append(f'coverage {cov:.2f}')
    wm = m[int(h * WATERMARK_ZONE[0]):, int(w * WATERMARK_ZONE[1]):]
    if wm.size and wm.mean() > WATERMARK_MAX_OBJECT:
        reasons.append(f'object under watermark zone ({wm.mean():.2f})')
    edges = {'left': m[:, :3].mean(), 'right': m[:, -3:].mean(),
             'top': m[:3, :].mean(), 'bottom': m[-3:, :].mean()}
    cut = [k for k, v in edges.items() if v > FRAME_TOUCH_MAX]
    if cut:
        reasons.append('touches frame: ' + ','.join(cut))
    _, _, stats, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    areas = sorted(stats[1:, cv2.CC_STAT_AREA], reverse=True)
    if len(areas) > 1 and areas[1] > FRAGMENT_MAX * areas[0]:
        reasons.append(f'{len(areas)} large fragments')
    cnts, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if cnts:
        big = max(cnts, key=cv2.contourArea)
        hull = cv2.contourArea(cv2.convexHull(big))
        solidity = cv2.contourArea(big) / hull if hull else 0
        if solidity < SOLIDITY_MIN:
            reasons.append(f'ragged outline (solidity {solidity:.2f})')
    return reasons
