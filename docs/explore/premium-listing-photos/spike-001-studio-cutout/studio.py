"""Spike 001: turn a Subito full-frame photo into a watermark-free "studio" product shot.

Option 2 = background replacement + light, non-generative correction. Item pixels are only
tone-adjusted (levels / saturation / sharpening) — never repainted.

usage: python studio.py <src_dir> <out_dir> [model]
"""
import sys, time, json
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageFilter, ImageEnhance
from rembg import new_session, remove

CANVAS = (1000, 1250)          # 4:5, matches the feed card
BG_TOP, BG_BOTTOM = (249, 249, 248), (232, 232, 231)   # neutral sweep = DESIGN.md surface tokens (spike ran warm #F7F5F2→#E5E1DB)


def keep_main_components(alpha: np.ndarray, min_ratio=0.04) -> np.ndarray:
    """Drop detached blobs (watermark, stray background bits) smaller than min_ratio of the largest."""
    _, bin_ = cv2.threshold(alpha, 127, 255, cv2.THRESH_BINARY)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(bin_, connectivity=8)
    if n <= 1:
        return alpha
    areas = stats[1:, cv2.CC_STAT_AREA]
    keep = {i + 1 for i, a in enumerate(areas) if a >= areas.max() * min_ratio}
    mask = np.isin(labels, list(keep)).astype(np.uint8)
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))       # keep soft edge pixels
    return (alpha * mask).astype(np.uint8)


def tone(rgb: Image.Image, alpha: np.ndarray) -> Image.Image:
    """Auto-levels measured on the object only, then gentle saturation/contrast/sharpen."""
    a = np.asarray(rgb).astype(np.float32)
    m = alpha > 200
    if m.sum() > 500:
        lo = np.percentile(a[m], 1, axis=0)
        hi = np.percentile(a[m], 99, axis=0)
        # blend 60% toward full stretch so colours stay believable
        stretched = (a - lo) / np.maximum(hi - lo, 1) * 255
        a = np.clip(0.4 * a + 0.6 * stretched, 0, 255)
    img = Image.fromarray(a.astype(np.uint8))
    img = ImageEnhance.Color(img).enhance(1.08)
    img = ImageEnhance.Contrast(img).enhance(1.05)
    return img.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))


def studio_bg() -> Image.Image:
    w, h = CANVAS
    t = np.linspace(0, 1, h)[:, None, None]
    grad = np.array(BG_TOP) * (1 - t) + np.array(BG_BOTTOM) * t
    return Image.fromarray(np.repeat(grad, w, axis=1).astype(np.uint8))


def compose(cut: Image.Image) -> Image.Image:
    bbox = cut.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    cut = cut.crop(bbox)
    w, h = CANVAS
    scale = min(w * 0.84 / cut.width, h * 0.72 / cut.height)
    cut = cut.resize((max(1, int(cut.width * scale)), max(1, int(cut.height * scale))), Image.LANCZOS)
    bg = studio_bg().convert('RGBA')
    x = (w - cut.width) // 2
    floor = int(h * 0.86)
    y = floor - cut.height
    # soft contact shadow: blurred ellipse under the object footprint
    sh = Image.new('L', CANVAS, 0)
    ell = Image.new('L', (int(cut.width * 1.05), max(12, int(cut.height * 0.07))), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(ell).ellipse((0, 0, ell.width - 1, ell.height - 1), fill=95)
    sh.paste(ell, (x - int(cut.width * 0.025), floor - ell.height // 2))
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    shadow = Image.new('RGBA', CANVAS, (60, 50, 40, 0))
    shadow.putalpha(sh)
    bg = Image.alpha_composite(bg, shadow)
    bg.alpha_composite(cut, (x, y))
    return bg.convert('RGB')


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    model = sys.argv[3] if len(sys.argv) > 3 else 'birefnet-general-lite'
    out.mkdir(parents=True, exist_ok=True)
    sess = new_session(model)
    log = []
    for p in sorted(src.glob('*.jpg')):
        t0 = time.time()
        img = Image.open(p).convert('RGB')
        rgba = remove(img, session=sess)
        alpha = keep_main_components(np.asarray(rgba.getchannel('A')))
        toned = tone(img, alpha)
        cut = toned.convert('RGBA'); cut.putalpha(Image.fromarray(alpha))
        Image.fromarray(alpha).save(out / f'{p.stem}-mask.png')
        compose(cut).save(out / f'{p.stem}.jpg', quality=84, optimize=True, progressive=True)
        log.append({'file': p.name, 'model': model, 'seconds': round(time.time() - t0, 2),
                    'object_coverage': round(float((alpha > 127).mean()), 3)})
        print(log[-1], flush=True)
    (out / 'log.json').write_text(json.dumps(log, indent=1))


if __name__ == '__main__':
    main()
