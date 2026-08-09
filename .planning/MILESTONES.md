# Milestones

## v1.0 — Venice Free Finds MVP

**Shipped:** 2026-08-09  
**Closeout type:** override_closeout  
**Known verification overrides:** 2 (see STATE.md Deferred Items)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 7 in scope (1–6, 8; Phase 7 deferred to v2.0) |
| Plans | 39 executed |
| Requirements | 34/34 v1 checked off |
| Timeline | 2026-07-24 → 2026-08-09 (16 days) |
| Git range | bd1e9f9 → ce19276 |
| Files changed | 521 (+70,018 LOC) |

### Delivered

Map-first PWA for Venice free-item discovery: Subito scraper with admin-configurable URL matrix (Venice + Padova), login-optional browsing, UGC marketplace with in-app DM, auth-gated favorites/alerts/push, trilingual UI (zh/en/it), and operator `/admin` console.

### Key Accomplishments

1. **Scraper foundation + admin console** — DB-driven ingest, zone tagging, soft-block alerts, per-source scheduler, translation pipeline, and Regalo URL matrix (34-URL seed)
2. **Map-first browsing** — MapLibre pins, bottom sheet, zone filters, scraped detail + Subito deep-link, 48h expiry
3. **UGC marketplace** — Quick Post, Street Dump, EXIF strip, DM with safety messaging, community reports + auto-hide
4. **Auth & notifications** — Login-optional browse; OAuth/OTP gates; keyword+zone alerts; push + badge fallback; iOS A2HS onboarding
5. **Trilingual UI** — Header/Settings language switch, browser locale seed, locale-aware push fan-out
6. **Padova supply expansion** — Category parser fix, city/region schema, consumer category chips

### Known Gaps (accepted as tech debt)

- Phase 4: no formal `04-VERIFICATION.md` (UAT 13/14 pass; Test 12 blocked on physical iPhone)
- Phase 4 UAT status `partial` (1 blocked scenario: iOS standalone push)
- CONT-03: FCFS read-then-insert race under concurrent buyers
- Google OAuth production redirect URLs pending operator config
- Nyquist validation not reconciled on any phase (`status: draft` VALIDATION.md files)
- Production deploy (Phase 7) deferred to v2.0

### Archives

- [Roadmap](milestones/v1.0-ROADMAP.md)
- [Requirements](milestones/v1.0-REQUIREMENTS.md)
- [Audit](milestones/v1.0-MILESTONE-AUDIT.md)
- [Phase artifacts](milestones/v1.0-phases/)

### Git Tag

`v1.0`

---

*Next milestone: v2.0 — Production Deploy (Phase 7)*
