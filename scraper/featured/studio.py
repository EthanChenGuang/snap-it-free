"""Studio rendering for featured picks (productionized from spike 001).

Background replacement + light, NON-generative correction: item pixels are only
tone-adjusted (levels / saturation / contrast / sharpening) and never repainted.
"""
from __future__ import annotations

import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

# 4:5 output used by the A' featured strip card.
CANVAS = (400, 500)
WEBP_QUALITY = 78
# Neutral sweep = DESIGN.md surface tokens (#f9f9f8 → #e8e8e7).
BG_TOP, BG_BOTTOM = (249, 249, 248), (232, 232, 231)


def cutout_alpha(img: Image.Image, session) -> np.ndarray:
    """Foreground alpha from the rembg session, cleaned of detached blobs."""
    from rembg import remove  # imported lazily so gate/compose tests need no model

    rgba = remove(img, session=session)
    return keep_main_components(np.asarray(rgba.getchannel('A')))


def keep_main_components(alpha: np.ndarray, min_ratio: float = 0.04) -> np.ndarray:
    """Drop detached blobs (watermark, stray background bits) smaller than min_ratio of the largest."""
    _, bin_ = cv2.threshold(alpha, 127, 255, cv2.THRESH_BINARY)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(bin_, connectivity=8)
    if n <= 1:
        return alpha
    areas = stats[1:, cv2.CC_STAT_AREA]
    keep = [i + 1 for i, a in enumerate(areas) if a >= areas.max() * min_ratio]
    mask = np.isin(labels, keep).astype(np.uint8)
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))  # keep soft edge pixels
    return (alpha * mask).astype(np.uint8)


def tone(rgb: Image.Image, alpha: np.ndarray) -> Image.Image:
    """Auto-levels measured on the object only, then gentle saturation/contrast/sharpen."""
    a = np.asarray(rgb).astype(np.float32)
    m = alpha > 200
    if m.sum() > 500:
        lo = np.percentile(a[m], 1, axis=0)
        hi = np.percentile(a[m], 99, axis=0)
        stretched = (a - lo) / np.maximum(hi - lo, 1) * 255
        a = np.clip(0.4 * a + 0.6 * stretched, 0, 255)  # 60% toward full stretch
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
    """Place an RGBA cutout on the neutral sweep with a soft contact shadow."""
    bbox = cut.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    if bbox:
        cut = cut.crop(bbox)
    w, h = CANVAS
    scale = min(w * 0.84 / cut.width, h * 0.72 / cut.height)
    cut = cut.resize((max(1, int(cut.width * scale)), max(1, int(cut.height * scale))), Image.LANCZOS)
    bg = studio_bg().convert('RGBA')
    x = (w - cut.width) // 2
    floor = int(h * 0.86)
    y = floor - cut.height
    sh = Image.new('L', CANVAS, 0)
    ell = Image.new('L', (int(cut.width * 1.05), max(5, int(cut.height * 0.07))), 0)
    ImageDraw.Draw(ell).ellipse((0, 0, ell.width - 1, ell.height - 1), fill=95)
    sh.paste(ell, (x - int(cut.width * 0.025), floor - ell.height // 2))
    sh = sh.filter(ImageFilter.GaussianBlur(7))
    shadow = Image.new('RGBA', CANVAS, (60, 50, 40, 0))
    shadow.putalpha(sh)
    bg = Image.alpha_composite(bg, shadow)
    bg.alpha_composite(cut, (x, y))
    return bg.convert('RGB')


def render(img: Image.Image, alpha: np.ndarray) -> Image.Image:
    toned = tone(img, alpha).convert('RGBA')
    toned.putalpha(Image.fromarray(alpha))
    return compose(toned)
