---
phase: featured-picks
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - scraper/featured/studio.py
  - scraper/featured/gate.py
  - scraper/featured/cli.py
  - scraper/featured/requirements.txt
  - scraper/featured/tests/test_pipeline.py
  - scraper/featured/tests/fixtures/clean.jpg
  - scraper/featured/tests/fixtures/watermark_overlap.jpg
autonomous: true
requirements: [FEAT-01, FEAT-02, FEAT-05, FEAT-08]
user_setup: []
must_haves:
  truths:
    - "cli.py turns a directory of full-frame JPEGs into 400x500 WebP studio images plus a JSON report"
    - "an image whose mask overlaps the bottom-right watermark zone is reported pass=false"
    - "item pixels are only tone-adjusted (no generative step anywhere)"
  artifacts:
    - scraper/featured/cli.py
    - scraper/featured/requirements.txt
  key_links:
    - "cli.py JSON report schema is consumed by plan 03 orchestrator"
---

<objective>
Productionize spike 001 as a small, pinned, tested Python CLI that only does image work.
</objective>

<context>
@docs/explore/premium-listing-photos/spike-001-studio-cutout/README.md
@docs/explore/premium-listing-photos/spike-001-studio-cutout/studio.py
@docs/explore/premium-listing-photos/spike-001-studio-cutout/gate.py
</context>

<tasks>
<task type="auto">
  <name>Task 1: Port studio + gate with A′ output spec</name>
  <files>scraper/featured/studio.py, scraper/featured/gate.py</files>
  <action>
  Copy spike code. Keep neutral sweep `(249,249,248)→(232,232,231)`, contact shadow, tone (levels 60 % blend,
  saturation 1.08, contrast 1.05, unsharp 1.6/60/2). Output **WebP 400×500 quality 78** (was 1000×1250 JPEG).
  Gate unchanged: coverage 0.08–0.80, watermark zone (bottom 12 %, right 20 %) > 2 % object → fail,
  frame touch > 25 %, second fragment > 15 % of largest, solidity < 0.45.
  </action>
  <verify>pytest (task 3)</verify>
  <acceptance_criteria>
    - studio.py contains `(249, 249, 248)` and `'WEBP'`
    - no import of any generative/diffusion library
  </acceptance_criteria>
  <done>Modules ported.</done>
</task>

<task type="auto">
  <name>Task 2: cli.py + pinned requirements</name>
  <files>scraper/featured/cli.py, scraper/featured/requirements.txt</files>
  <action>
  `python cli.py --in DIR --out DIR --report report.json [--model birefnet-general-lite]`.
  Input files named `<listing_id>.jpg`. For each: cutout, gate, write `<listing_id>.webp` only if pass.
  Report: `[{ "listing_id", "pass", "reasons": [...], "seconds" }]`. Never raise on one bad image —
  record `pass=false, reasons=["error: ..."]`. Exit 0 unless the model fails to load.
  requirements.txt pins exact versions of: onnxruntime, numpy, pillow, opencv-python-headless, scipy,
  pooch, tqdm, jsonschema, numba, scikit-image; separate `requirements-nodeps.txt` for `rembg`, `pymatting`
  (installed with `--no-deps`, as in the spike).
  </action>
  <verify>`python -I scraper/featured/cli.py --help`</verify>
  <acceptance_criteria>
    - every line in requirements files uses `==`
  </acceptance_criteria>
  <done>CLI runs.</done>
</task>

<task type="auto">
  <name>Task 3: pytest on two fixtures</name>
  <files>scraper/featured/tests/test_pipeline.py, scraper/featured/tests/fixtures/*</files>
  <action>
  Fixtures: spike sample 07 (child bike seat → pass) and 04 (wardrobe, watermark overlap → fail), downscaled
  to ≤ 800 px, < 150 KB each. Test: report has 2 rows, 07 pass with a 400×500 WebP, 04 pass=false with a
  reason containing "watermark".
  </action>
  <verify>`cd scraper/featured && python -m pytest -q`</verify>
  <acceptance_criteria>
    - test asserts output size `(400, 500)` and format `WEBP`
  </acceptance_criteria>
  <done>Tests green locally.</done>
</task>
</tasks>

<threat_model>
| Threat | Mitigation |
|---|---|
| Malformed/huge input image crashes the job | Pillow decompression-bomb limit kept; per-image try/except |
| Supply-chain drift in Python deps | exact pins; `--no-deps` limited to two packages |
| Model file tampering | download only from rembg's GitHub release URL; cache key includes model name |
</threat_model>

<verification>
- [ ] `python -m pytest -q` in `scraper/featured`
</verification>
