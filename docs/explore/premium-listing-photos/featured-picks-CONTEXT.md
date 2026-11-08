# Phase: 今日精选 (Featured Picks) - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning
**Branch:** `claude/featured-picks` (kept separate from the photo fixes in PR #11; the owner decides later whether this ships)

<domain>
## Phase Boundary

Show, at the top of the home feed, a horizontal strip of owner-approved listings whose cover photo
has been turned into a watermark-free "studio" shot (background replaced, light non-generative tone
correction), using visual variant A′. Everything below the strip stays as it is today.

Scope source: `docs/explore/premium-listing-photos/phase-featured-picks.md` (FEAT-01…08). This
discussion only decides HOW; it adds no capabilities.
</domain>

<decisions>
## Implementation Decisions

### Where processing runs
- **D-01:** A new **GitHub Actions workflow**, once a day, runs the cutout pipeline
  (`birefnet-general-lite` via rembg/onnxruntime, CPU). No paid inference.
- **D-02:** Budget: ~177 new listings/day × ~7 s ≈ 20 min/day ≈ 600 min/month, plus the existing
  `subito-scheduler.yml` (~900 min/month) ≈ 1,500 of the 2,000 free private-repo minutes. The
  workflow must cap its own runtime (e.g. stop after N images / 25 min) so the scraper is never
  starved, and only process candidates (see D-05), not every listing.
- **D-03:** Fallback if the Actions budget runs out: hosted open model (~$0.0005/img, ~$3/month).
  Not built now; noted so the pipeline keeps the "cutout" step behind one function boundary.

### Per-city featured picks
- **D-04:** Featured picks are **per consumer city** (`ConsumerCity` keys in `lib/listings/filters.ts`).
  A user sees the picks for the city they selected in the feed filter.
- **D-05:** Candidates per city per day = newest listings with a photo, category not `animali`,
  posted in the last 24 h; cap candidates per city so review stays small.
- **D-06:** If a city has no approved, still-active picks, the strip is hidden for that city
  (FEAT-07 — no empty state).
- **D-07:** Accepted cost: the owner's review load grows with the number of cities that have candidates.

### Owner review
- **D-08:** New **mobile-friendly admin review page** under `/admin` (operator-gated like the rest of
  the console). One card at a time: original photo vs studio shot, title, city; **swipe / tap
  通过 or 不要**.
- **D-09:** When the daily candidates are ready, send the owner a **push notification** linking to the
  review page (reuse the existing web-push stack).
- **D-10:** If the owner doesn't review on a given day, keep showing **previously approved picks that
  are still active** (listing not expired/removed). Nothing unreviewed is ever shown.

### Quality gate
- **D-11:** **No vision-AI gate in v1.** Owner review is the safety net for watermarks and bad cutouts
  (FEAT-01). Keep the spike-001 mask heuristics (`gate.py`: watermark zone, frame-touching,
  fragments, solidity, coverage) only to pre-filter obvious failures before they reach review.
- **D-12:** Revisit a vision-AI gate (~$0.001/img) only if review volume becomes a burden.

### Locked from earlier decisions (not re-discussed)
- **D-13:** Never display a watermark (Subito logo or camera stamp). Full-frame `gallery-*` images are
  used as pipeline input only, never displayed.
- **D-14:** Non-generative: item pixels are only tone-adjusted; shape and wear unchanged.
- **D-15:** Visual = A′ (`sketch-featured-final.html`): 4:5 cards at 40 % width, neutral studio sweep
  `#F9F9F8 → #E8E8E7`, no text over images, real count + "店主每日挑选", staggered reveal honoring
  `prefers-reduced-motion`. Tapping a card opens the normal listing detail page.
- **D-16:** Supabase plan is **Free**. Studio images are stored as WebP 400×500 (~12 KB) and deleted
  when the listing expires or the pick is rejected; surface storage/egress in the existing quota card.

### Claude's Discretion
- City selector = `all`: mix of every city's approved picks, newest approvals first; `other`: hide.
- Max picks shown per city (suggest ≤ 20) and candidate cap per city (suggest ≤ 15/day).
- Table / bucket naming, cron time, exact notification copy, review-page interaction details.
</decisions>

<specifics>
## Specific Ideas
- The owner reviews on a phone only (no computer available) — the review page must be fully usable
  on a phone.
- Keep the strip feeling like part of the existing Structured Minimalist UI (`DESIGN.md`), not a
  separate product.
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Decisions and scope
- `docs/explore/premium-listing-photos/README.md` — why this direction, real volume, cost model
- `docs/explore/premium-listing-photos/phase-featured-picks.md` — FEAT-01…08, pipeline draft, out of scope
- `docs/explore/premium-listing-photos/research-questions.md` — open questions (DAU/egress, Free limits, R2)

### Pipeline evidence
- `docs/explore/premium-listing-photos/spike-001-studio-cutout/README.md` — PARTIAL verdict, model choice, OOM on full BiRefNet, watermark limits
- `docs/explore/premium-listing-photos/spike-001-studio-cutout/studio.py` — cutout + tone + composite reference implementation
- `docs/explore/premium-listing-photos/spike-001-studio-cutout/gate.py` — mask heuristics pre-filter

### Visual
- `docs/explore/premium-listing-photos/sketch-featured-final.html` — A′ final sketch with rationale table
- `DESIGN.md` — Structured Minimalist tokens (surface colors, type, radii)

### Photo rules
- `lib/listings/subito-photo-url.ts` — Subito presets; watermark policy (on PR #11 branch)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/subito-scheduler.yml`: pattern for a scheduled Actions job (Node 22, `scraper/` deps, 45-min timeout, concurrency group).
- `lib/admin/require-operator.ts`, `lib/admin/operator-access.ts`: operator gating for the new review page.
- `components/admin/AdminShell.tsx`: admin layout to host the review page.
- `lib/notifications/web-push.ts`: push sending for the "candidates ready" notification.
- `lib/admin/quota-usage.ts` + `components/admin/QuotaUsageCard.tsx`: Free-tier storage limits (1 GB) and quota display — extend for the featured bucket.
- `components/listings/ListingPhoto.tsx`: shimmer placeholder + lazy loading to reuse for strip cards.
- `lib/listings/filters.ts` (`ConsumerCity`, `listingConsumerCity`, `matchesConsumerCity`): city mapping for per-city picks.

### Established Patterns
- Supabase Storage bucket usage exists for UGC (`ugc-photos`, public URLs via `getPublicUrl`).
- Admin console is operator-allowlisted (`operator_allowlist` table).
- Feed composition happens client-side in `components/listings/FeedHomeClient.tsx` via `composeFeedListings`.
- Trilingual UI (zh default, en, it) — all new strings in `messages/` for all three locales.

### Integration Points
- Home feed: strip mounts at the top of `FeedHomeClient` above the grid, keyed to the applied city filter.
- New DB objects (e.g. `featured_candidates` / `featured_picks`) + RLS: public read of approved picks only.
- New Actions workflow writes processed WebP to Storage and candidate rows to DB with the service role.
</code_context>

<deferred>
## Deferred Ideas
- Vision-AI quality gate (D-12).
- Hosted inference fallback (D-03).
- Moving studio images to Cloudflare R2 if Free egress becomes a problem (research-questions RQ-3).
- Studio treatment for UGC photos.
- Generating high-fidelity Stitch screens for A′ — blocked: Stitch API key can only be entered from a
  computer; owner currently has only a phone.
- PRODUCT.md is out of date (nationwide, ~6-month expiry vs documented Veneto/48 h) — separate docs fix.
</deferred>

---

*Phase: featured-picks*
*Context gathered: 2026-11-08*
