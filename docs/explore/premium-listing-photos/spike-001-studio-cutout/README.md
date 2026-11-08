---
spike: 001
idea: premium-listing-photos
name: studio-cutout
type: standard
validates: "Given a full-frame (watermarked) Subito photo, when we cut out the item with an open background-removal model and composite it on a studio sweep with light tone correction, then the item is complete, watermark-free and looks catalogue-grade"
verdict: PARTIAL
related: []
tags: [images, background-removal, rembg, birefnet, subito, watermark]
---

# Spike 001: Studio cutout

## What This Validates
Given a full-frame Subito photo (which carries the Subito watermark), when we cut out the item
with an open model and composite it on a uniform warm-grey studio sweep with soft contact shadow
and light, non-generative tone correction (auto-levels on the object, +8% saturation, +5%
contrast, unsharp mask), then the result is complete, watermark-free and looks premium.

## Research
| Approach | Tool | Cost | Notes |
|---|---|---|---|
| Hosted open model | Replicate rembg/BiRefNet | ~$0.0004–0.0005/img (3rd-party figures) | cheapest hosted |
| Self-hosted open model | rembg (`birefnet-general-lite`, `isnet-general-use`) | compute only | used here |
| Commercial API | Photoroom remove-bg / edit | $0.02 / $0.10 per img | not tested |
| remove.bg | — | — | API reportedly shutting down 2026-12-01 |

Real volume (Supabase `listings_public`, 2026-11-08): 15,428 active, ~177 new/day.

## How to Run
```bash
python -m venv venv && venv/bin/pip install onnxruntime numpy pillow opencv-python-headless scipy pooch tqdm jsonschema numba scikit-image && venv/bin/pip install --no-deps rembg pymatting
# src/NN.jpg = <photo_url base>?rule=gallery-desktop-2x-auto (full frame); see results/sample.json
venv/bin/python studio.py src out birefnet-general-lite
venv/bin/python gate.py out results/sample.json
```

## What to Expect
`out/NN.jpg` 1000×1250 studio composites, `out/NN-mask.png` alpha masks, `gate.json` pass/fallback.
`results/sheet-*.jpg`: row 1 = full-frame source, row 2 = current watermark-free crop (feed today),
row 3 = studio cutout.

## Investigation Trail
1. **birefnet-general-lite on 15 real listings** (5 furniture, 2 appliances, 2 kids, garden, books,
   clothing, bike, audio-video, animals). ~7 s/img on CPU (224 MB model).
   - Good (6): 00 bed frame, 06 hand blender, 07 child bike seat, 08 toy kitchen, 11 down coat, 13 TV.
   - Partial (4): 02 table (+stray stick), 05 scale (**faint watermark left on item edge**),
     10 books (shelf fragments), 12 bike (source photo only shows part of it).
   - Failed (5): 01 picked the wrong object (a metal strut instead of the panel), 03 cabinet
     missing a side, 04 wardrobe half missing **and Subito watermark kept on the item**,
     09 pallets messy, 14 dog cut out together with the owner's foot.
2. **Bigger model?** `birefnet-general` (full, ~1 GB) was OOM-killed in a 16 GB container on the
   first image → not viable on a small worker. `isnet-general-use` is 8× faster (~0.9 s/img) but
   worse on 6 of 7 hard cases (only 03 improved). **The watermark stays on 03/04/05 with every
   model** — when the logo overlaps the item, background removal cannot remove it.
3. **Quality gate** (`gate.py`, mask heuristics: coverage, object in watermark zone, touching
   frame, fragments, solidity). Catches every watermark risk (00, 03, 04, 05) but is imprecise:
   passes 4/15 (02, 07, 09, 11) of which only 07 and 11 are actually good; wrongly rejects good
   00, 06, 08, 13.

## Results
**Verdict: PARTIAL.**
- When it works (≈40% of real photos) the studio look is a clear upgrade — this is the
  "catalogue" feel the owner wants.
- Fully automatic processing of every listing is **not** viable: ~1/3 fail visibly and the
  watermark cannot be removed when it overlaps the item (violates a hard requirement).
- A safe pipeline needs a gate + fallback to today's watermark-free crop; with naive heuristics
  only ~15–25% of photos would get the studio treatment, and some bad ones still slip through.
- Cost is not the blocker (compute: ~7 s CPU/img; ~177 img/day ≈ 20 CPU-min/day).
- Next things worth testing: (a) a better gate — e.g. a cheap vision-LLM check
  "is the cutout complete, single item, no logo?" (~$0.001/img); (b) using the watermark-free
  `card-desktop-new-small-4x-auto` crop as source when the item is fully inside it; (c) applying
  the treatment only to curated "hero" listings instead of everything.
