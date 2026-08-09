# Phase 3: UGC Posting & Community Marketplace - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 3-UGC Posting & Community Marketplace
**Mode:** --auto (all areas auto-selected, recommended defaults chosen)
**Areas discussed:** Auth scope, UGC post flow, Photo upload & EXIF, Location & pin placement, Schema & lifecycle, UGC detail branching, In-app DM, Safety messaging, Moderation & reports, Rate limiting

---

## Auth Scope (Phase 3 vs Phase 4)

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal email magic-link auth in Phase 3 for UGC paths only | Satisfies UGC-04/CONT-04; defers Google/Apple to Phase 4 | ✓ |
| Defer all auth to Phase 4 | Would block UGC-04 and CONT-04 requirements | |
| Ship full OAuth matrix now | Scope creep into Phase 4 AUTH-01 | |

**Auto-selected:** Minimal email magic-link auth in Phase 3 for UGC paths only
**Notes:** [auto] Auth scope — Q: "When should login ship?" → Selected: "Minimal Supabase email magic link for post/DM/manage only" (recommended default)

---

## UGC Post Flow & Street Dump

| Option | Description | Selected |
|--------|-------------|----------|
| Two-tab `/post`: Quick Post + Street Dump with map confirm | Matches UGC-01/UGC-02; Pitfall 8 mitigation | ✓ |
| Single form with optional "use my location" toggle | Simpler but weaker Street Dump identity | |
| Port full Vite prototype with categories/conditions | Too slow for <30s target | |

**Auto-selected:** Two-tab `/post` with Street Dump map confirm
**Notes:** [auto] Post flow — Q: "How do users enter posting modes?" → Selected: "Two tabs, Street Dump never auto-publishes GPS" (recommended default)

---

## Photo Upload & EXIF

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Storage + server-side sharp EXIF strip | Satisfies UGC-03; prevents home GPS leak | ✓ |
| Client-side strip only | Insufficient — EXIF can survive some clients | |
| External CDN upload (Cloudinary) | Budget/complexity overkill for v1 | |

**Auto-selected:** Supabase Storage + server-side sharp EXIF strip
**Notes:** [auto] EXIF — Q: "Where and how to strip metadata?" → Selected: "Server-side sharp before Storage write" (recommended default)

---

## Location & Pin Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Zone chip + mini-map pin; server-side Turf tagging | Consistent with Phase 1 zone-at-ingestion | ✓ |
| Zone chip only, centroid pin | Loses map accuracy for pickup | |
| Raw GPS auto-submit on Street Dump | Violates Pitfall 8 | |

**Auto-selected:** Zone chip + mini-map with server-side Turf tagging
**Notes:** [auto] Location — Q: "How is pin/zone determined?" → Selected: "User places pin, server computes zone from GeoJSON" (recommended default)

---

## In-App DM Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| conversations + messages tables; poll refresh; FCFS implicit | Lean solo-builder pattern from research architecture | ✓ |
| Supabase Realtime subscriptions | Extra complexity not needed at Venice scale | |
| Full messaging platform with read receipts/typing | Scope creep | |

**Auto-selected:** Poll-based DM with FCFS implicit single buyer thread
**Notes:** [auto] DM — Q: "How fresh is DM?" → Selected: "10s poll while open, one active buyer thread" (recommended default)

---

## Moderation & Report Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| Scraped: 2 reports instant hide; UGC: 3 reports → pending_review | Pitfall 6 mitigation; MOD-02 distinction | ✓ |
| Uniform 2-report threshold for all sources | Gameable against UGC posters | |
| Manual review only, no auto-hide | Fails MOD-02 automation requirement | |

**Auto-selected:** Distinct thresholds (2 scraped / 3 UGC pending_review)
**Notes:** [auto] Moderation — Q: "Same threshold for scraped and UGC?" → Selected: "No — 3 + pending_review for UGC" (recommended default)

---

## Safety Messaging

| Option | Description | Selected |
|--------|-------------|----------|
| Acknowledgment modal on first send + persistent thread banner | Satisfies CONT-05; Pitfall 7 | ✓ |
| Static help page link only | Insufficient for meetup risk moments | |
| No safety UX in Phase 3 | Violates requirements and research | |

**Auto-selected:** First-send modal + thread banner
**Notes:** [auto] Safety — Q: "When to show meetup guidance?" → Selected: "Modal before first message + in-thread banner" (recommended default)

---

## Claude's Discretion

- sharp compression quality
- DM modal vs dedicated route
- Mini-map MapLibre vs static zone map for pin placement
- Poster manage listings location (`/post/manage` vs settings)
- Anonymous report fingerprint strategy

## Deferred Ideas

- Google/Apple OAuth — Phase 4
- Push on new DM — Phase 4 optional
- Operator moderation dashboard — post-v1
- Multi-buyer DM queue — future
