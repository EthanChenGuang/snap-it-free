---
status: complete
phase: 03-ugc-posting-community-marketplace
source:
  - 03-01-SUMMARY.md
  - 03-02-SUMMARY.md
  - 03-03-SUMMARY.md
  - 03-04-SUMMARY.md
started: 2026-08-01T09:30:00Z
updated: 2026-08-01T14:11:00Z
test_env: "Migrations 006–010 applied; dev server localhost:3001; redirect URL configured"
---

## Current Test

[testing complete]

## Migration Apply

Migrations 006–010 applied via pooler `aws-0-eu-west-3.pooler.supabase.com`.

## Automated Runs (2026-08-01)

| Script | Result |
|--------|--------|
| `phase3-uat-automation.mjs` | 9/9 |
| `phase3-live-uat.mjs` | 17/17 |
| `phase3-e2e-uat.mjs` | 11/11 — magic link OTP session, Quick Post, EXIF |
| `phase3-street-dump-uat.mjs` | 4/4 — Playwright geolocation + pin gate |
| `npm run test:lib` | 55/55 |

**Note:** Email magic links from `generateLink` return hash tokens; app callback expects PKCE `code`. E2E uses admin `verifyOtp` + SSR cookies (same session shape as authenticated API routes).

## Tests

### 1. Quick Post end-to-end
expected: Listing appears on `/` map pins and `/list` after refresh; `/listing/[id]` shows UgcListingShell with Community badge
result: pass
notes: E2E upload → create 201 → listings_public → detail page 200

### 2. Magic link session persistence
expected: Complete auth callback; POST to `/api/ugc/listings` returns 201 without re-login
result: pass
notes: OTP session cookie; consecutive API calls return 201

### 3. Street Dump GPS seed without auto-publish
expected: Geolocation seeds pin on map but submit stays disabled until explicit confirm (button or drag)
result: pass
notes: Playwright submit disabled → Conferma posizione → submit enabled; geolocation granted

### 4. DM two-user flow
expected: Buyer sends message via Contatta; seller sees message within 10s poll window
result: pass
notes: live UAT

### 5. DM reopen after closing drawer
expected: Second Contatta tap returns existing conversation (200 + existing:true), drawer resumes thread — not bare 409
result: pass
notes: live UAT

### 6. Report auto-hide trigger
expected: Three distinct users report same UGC listing → status=hidden, hidden_reason=pending_review; non-owners get 404; owner sees HiddenReviewBanner
result: pass
notes: live UAT

### 7. EXIF strip on stored photo
expected: Upload photo with GPS EXIF; download from ugc-photos bucket shows no GPS metadata
result: pass
notes: E2E JPEG with EXIF uploaded; stored object has no EXIF segment

### 8. Rate limit live enforcement
expected: Fourth UGC post by same user within 24h returns 429 with Italian rate-limit message
result: pass
notes: live UAT (3/24h limit)

### 9. Poster lifecycle (reserved → delivered)
expected: Owner PATCH reserved → Riservato badge on map popup; PATCH delivered → listing excluded from listings_public
result: pass
notes: live UAT claimed in public view; expired excluded

### 10. Owner views hidden UGC after moderation
expected: Owner sees HiddenReviewBanner on own hidden pending_review listing; non-owner gets 404
result: pass
notes: live UAT ugc_select_own RLS

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

### Code review (advisory — fix before production)
See `03-REVIEW.md`: 4 critical RLS bypass issues (CR-01–CR-04). Run `/gsd-code-review 03 --fix` before shipping.

### Auth callback note
Real email magic links may redirect with `#access_token` (implicit) while `/auth/callback` only handles `?code=` (PKCE). If users report auth=error after clicking email links, enable PKCE flow on browser client or add hash-token handling on a client callback page.
