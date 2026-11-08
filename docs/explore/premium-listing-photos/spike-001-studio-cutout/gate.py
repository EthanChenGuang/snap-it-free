"""Quality gate: decide per photo whether the studio cutout is safe to show, else fall back to
the plain watermark-free crop. Pure heuristics on the alpha mask — no extra model calls.

usage: python gate.py <out_dir_with_masks> [category_json]
"""
import sys, json
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

SKIP_CATEGORIES = {'animali'}   # live animals: people/hands in frame, cutouts read as odd


def check(mask: np.ndarray):
    h, w = mask.shape
    m = mask > 127
    cov = m.mean()
    reasons = []
    if not 0.08 <= cov <= 0.80:
        reasons.append(f'coverage {cov:.2f}')
    # Subito watermark sits in the bottom-right corner; any object pixels there => logo may be on the item
    wm = m[int(h * 0.88):, int(w * 0.80):]
    if wm.mean() > 0.02:
        reasons.append(f'object under watermark zone ({wm.mean():.2f})')
    # item cut by the frame => cutout shows a hard straight edge
    edges = {'left': m[:, :3].mean(), 'right': m[:, -3:].mean(), 'top': m[:3, :].mean(), 'bottom': m[-3:, :].mean()}
    cut = [k for k, v in edges.items() if v > 0.25]
    if cut:
        reasons.append('touches frame: ' + ','.join(cut))
    # fragmented mask => wrong/partial segmentation
    n, _, stats, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    areas = sorted(stats[1:, cv2.CC_STAT_AREA], reverse=True)
    if len(areas) > 1 and areas[1] > 0.15 * areas[0]:
        reasons.append(f'{len(areas)} large fragments')
    # ragged outline => partial segmentation (solidity = area / convex hull area)
    cnts, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if cnts:
        big = max(cnts, key=cv2.contourArea)
        hull = cv2.contourArea(cv2.convexHull(big))
        solidity = cv2.contourArea(big) / hull if hull else 0
        if solidity < 0.45:
            reasons.append(f'ragged outline (solidity {solidity:.2f})')
    return reasons


def main():
    out = Path(sys.argv[1])
    cats = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else []
    res = {}
    for p in sorted(out.glob('*-mask.png')):
        stem = p.name.removesuffix('-mask.png')
        reasons = check(np.asarray(Image.open(p)))
        idx = int(stem)
        if cats and cats[idx]['category'] in SKIP_CATEGORIES:
            reasons.append('category skipped')
        res[stem] = {'pass': not reasons, 'reasons': reasons}
        print(stem, 'PASS' if not reasons else 'FALLBACK', '; '.join(reasons))
    (out / 'gate.json').write_text(json.dumps(res, indent=1))


if __name__ == '__main__':
    main()
