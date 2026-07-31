---
phase: 3
reviewers: [gemini, claude]
reviewed_at: 2026-07-31T06:35:00Z
plans_reviewed:
  - 03-01-PLAN.md
  - 03-02-PLAN.md
  - 03-03-PLAN.md
  - 03-04-PLAN.md
reviewer_failures:
  gemini: "GOOGLE_CLOUD_PROJECT env var required; MCP server taskmaster-ai connection failed"
---

# Cross-AI Plan Review — Phase 3

## Gemini Review

Gemini review failed or returned empty output. stderr:

```
failed to start or connect to MCP server 'taskmaster-ai' {"command":"npx"};
McpError: MCP error -32000: Connection closed
An unexpected critical error occurred:
Error: This account requires setting the GOOGLE_CLOUD_PROJECT env var. See https://goo.gle/gemini-cli-auth-docs#workspace-gca
```

---

## Claude Review

# Cross-AI Plan Review: Phase 3 — UGC Posting & Community Marketplace

I read all four plans against the actual repository state (not just the plan text) — current `listings` schema, RLS policies, `ListingRow` type, `messages/it.ts`, `ScrapedListingShell`/`HeroMetadata`/`DetailTopBar`, `lib/supabase/server.ts`, `package.json`, and the Vite/Stitch reference components. Several findings below are compounding issues that span 2-3 plans; I've flagged them where they first originate and referenced forward.

---

## Cross-Cutting Critical Findings (apply to multiple plans)

### 🔴 CRITICAL — Report-count RPCs are callable directly by any authenticated client, defeating the anti-gaming design (Plan 03)

Plan 03 Task 1 specifies two `SECURITY DEFINER` SQL functions in `supabase/migrations/008_increment_report_count.sql`:
```
increment_listing_report(p_listing_id uuid) ... GRANT EXECUTE to authenticated
apply_listing_auto_hide(p_listing_id uuid, p_hidden_reason text) ... GRANT EXECUTE to authenticated
```
Neither function embeds any authorization or threshold check — the plan's intent is for the Next.js Route Handler (`app/api/reports/route.ts`) to do the report-insert + threshold check, then call these RPCs as trusted follow-up steps.

But Supabase exposes every function granted to `authenticated` directly via PostgREST at `/rest/v1/rpc/<fn>` using the same JWT the browser already holds (verified against `lib/supabase/client.ts:1-7`, which uses the standard `createBrowserClient` — same permission model). Any logged-in user can open devtools and call:
```js
supabase.rpc('apply_listing_auto_hide', { p_listing_id: '<any-id>', p_hidden_reason: 'pending_review' })
```
to hide **any** listing instantly, or spam `increment_listing_report` in a tight loop to push `report_count` past threshold without ever touching the `listing_reports` unique-per-reporter constraint. This directly defeats Pitfall 5 / D-81 (the whole reason UGC gets a 3-report threshold instead of 2 — "gameable UGC takedown"), and the plan's own STRIDE table (T-03-11) only addresses "service-role leak," not this RPC-exposure vector.

**Fix:** embed the authorization/threshold logic *inside* the SQL functions (check `auth.uid()`, verify a corresponding `listing_reports` row exists, compute source-based threshold in SQL) rather than trusting the Route Handler's pre-check — the RPC boundary, not the Next.js boundary, is the actual trust boundary here.

### 🔴 HIGH — Owner can never see their own hidden listing (Plans 01, 03, 04)

This is three separate gaps that compound into a fully broken MOD-03:

1. **No RLS policy lets an owner SELECT their own non-active row.** The only SELECT policy on `public.listings` is `public_read_active_non_expired` (`supabase/migrations/004_listings_public_read_rls.sql:9-16`): `using (status = 'active' and expires_at > now())`. Migration 006 revokes `SELECT` from `anon` only — `authenticated` still has the grant, but is still bound by this same RLS predicate. Plan 01's migration 007 task text enumerates every policy it will create ("ugc_insert_own and ugc_update_own on listings; conversation_select_participant..."), and there is **no** owner-scoped SELECT policy anywhere in the list. An UPDATE policy's `USING` clause does not grant SELECT for a plain read.

2. **`getOwnerListingById` (introduced in Plan 03 Task 2) queries the base `listings` table** expecting to retrieve hidden rows for the owner — per (1), this will return zero rows for hidden UGC even for the actual owner.

3. **`app/listing/[id]/page.tsx` is never revisited after Plan 01** (confirmed: not in Plan 02/03/04 `files_modified`). It calls `getListingById` (`lib/listings/queries.ts:48-66`), which reads from `listings_public` — a view that by construction excludes `hidden` rows. So even if (1) and (2) were fixed, the route calls `notFound()` before `UgcListingShell` is ever reached, and `HiddenReviewBanner` never renders regardless of who's viewing.

**Net effect:** MOD-03 ("poster sees hidden banner on own listing") is unreachable as currently planned, and this isn't a minor edge case — it's the plan's own headline scenario for D-83.

### 🟠 MEDIUM-HIGH — No data path for `owner_user_id` on the client at all (Plan 04)

Plan 04's UgcListingShell owner-view branch ("replace Contatta with lifecycle buttons when session user equals owner_user_id") requires comparing the logged-in user against `listing.owner_user_id`. But:
- `listings_public` (per the migration 007 sketch every plan defers to) selects `id, source, title, photo_url, external_url, lat, lng, zone, posted_at, expires_at, status` — no `owner_user_id`.
- Plan 01's `ACTIVE_LISTING_COLUMNS` extension only adds `status` (per its `must_haves`/task text).
- No plan adds `owner_user_id` to the view or to `ListingRow`.

There is no specified way for the detail page to know it's rendering for the owner. This is the same root cause as the finding above (owner-scoped reads were never designed), but it separately breaks CONT-02/CONT-03's UI surface, not just MOD-03.

### 🟠 MEDIUM — `/post/manage` has no defined data source (Plan 04)

`ManageListingsClient.tsx` (Plan 04) needs to list *all* of a user's UGC listings, including hidden/claimed/expired ones. Plan 03 only introduces `getOwnerListingById(id)` (singular, by listing id — used for the detail-page banner). Plan 04's `files_modified` list does not touch `lib/listings/queries.ts` at all, so no bulk `getOwnerListings(userId)`-style function exists anywhere in the four plans. Even if it did, it would hit the same RLS gap described above for any non-active row.

### 🟡 MEDIUM — Missing `@radix-ui/react-dialog` dependency (Plan 01)

`package.json` currently has `@radix-ui/react-slot` and `@radix-ui/react-toast` only (verified). Plan 01 creates `components/ui/dialog.tsx` as "Radix Dialog (new)" per UI-SPEC's Component Inventory (`AuthPromptModal`, later `SafetyModal` in Plan 02, both build on this primitive) — but Plan 01's install step is `npm install sharp @turf/boolean-point-in-polygon` only. `@radix-ui/react-dialog` is never installed. `next build` will fail on the missing import the first time `dialog.tsx` is created.

### 🟡 MEDIUM — `ugc-photos` Storage bucket creation is never explicit (Plan 01)

The migration 007 sketch (repeated in Plan 01's task text) only writes RLS *policies* scoped to `bucket_id = 'ugc-photos'` — it never creates the bucket (`insert into storage.buckets ...` or equivalent). Plan 01's `user_setup.dashboard_config` lists "Apply migration 007," "Confirm Email auth provider," and "Add redirect URL" — no "create ugc-photos bucket" step. Per RESEARCH's own Pitfall 2 ("Storage Upload 403... bucket exists but policies missing"), the inverse failure (policies exist, bucket doesn't) will produce a different but equally hard 404/"Bucket not found" on the very first upload attempt, silently blocking UGC-01/UGC-03 end-to-end.

### 🟡 MEDIUM — Reopening a DM has no recovery path (Plan 02)

Task 1: "INSERT conversation with unique (listing_id, buyer_user_id) — return 409 on duplicate." The FCFS check only counts *other* buyers' conversations (`buyer_user_id not equal current user`), so a returning buyer who already has a conversation on this listing falls through to the INSERT, hits the unique constraint, and gets a bare 409 with no conversation id in the response. Nothing in Plan 02 tells the client how to recover the existing `conversation_id` to resume polling — DmDrawer has no id to call the messages endpoint with. This breaks the ordinary "close drawer, reopen later" flow, not just an edge case.

---

## Plan-by-Plan Review

### 03-01-PLAN.md — Tracer (migration, auth, Quick Post, UGC detail)

**Summary:** Structurally the right tracer-first slice (auth cookie fix → upload → create → detail render), and correctly identifies/fixes the three real landmines RESEARCH flagged (`setAll` no-op, hardcoded `source !== 'subito'` gate, `listings_public` excluding claimed UGC). But it under-specifies the RLS surface it creates (missing owner-SELECT policy — see cross-cutting finding) and misses a dependency (`@radix-ui/react-dialog`) and a Storage prerequisite (bucket creation) that block the very pipeline it's meant to prove out.

**Strengths:**
- Correctly targets the real bug in `lib/supabase/server.ts:12` (`setAll: () => {}`) before any auth work — this is genuinely broken today, confirmed by reading the file.
- Correctly targets `app/listing/[id]/page.tsx:20` (`listing.source !== 'subito'` → `notFound()`) as the detail-route landmine.
- Zone-tag port target (`lib/geo/zone-tag.ts`) is a clean, low-risk copy from `scraper/src/shared/zone-tag.ts` — confirmed the source file and its test coordinates exist and are portable verbatim.
- Package audit for `sharp` is reasonable (default `.jpeg().toBuffer()` does strip EXIF; this is standard sharp behavior).

**Concerns:**
- **HIGH** — Migration 007's enumerated RLS policy list has no owner-SELECT-own-listings policy, blocking every later plan that needs to read a hidden/non-active own row (see cross-cutting finding).
- **MEDIUM** — `@radix-ui/react-dialog` never installed despite `components/ui/dialog.tsx` being a required artifact.
- **MEDIUM** — `ugc-photos` bucket never explicitly created (migration or dashboard step).
- **LOW** — RESEARCH's `CreateListingSchema` example bounds (`lat 45.35–45.55`, `lng 12.15–12.45`) are tighter than the scraper's existing bounds (`lat 45.0–45.7`, `lng 12.1–12.6`, per `scraper/src/shared/schema.ts` as referenced in PATTERNS.md:299). If Plan 01 copies the tighter bounds verbatim, a legitimate Lido/outer-island pin could be rejected by Zod before ever reaching `tagZone()`. Worth explicitly reusing the scraper's existing bounds instead of RESEARCH's example.
- **LOW** — `HeroMetadata.tsx:34-36` and `ListingCard.tsx:47-49` currently hardcode the Subito badge unconditionally (confirmed by reading both files); the plan's `files_modified` list does include them, so this is a "make sure the branch condition is actually added" note, not a missing-file gap.

**Suggestions:**
- Add `@radix-ui/react-dialog` to the npm install line explicitly.
- Add an owner-scoped SELECT policy to migration 007's list now (e.g., `using (owner_user_id = auth.uid())` for select), since Plan 03/04 depend on it and retrofitting a migration after downstream plans assume its absence is expensive.
- Add a `insert into storage.buckets (id, name, public) values ('ugc-photos', 'ugc-photos', true)` (or equivalent dashboard step in `user_setup`) to migration 007's action text.
- Reuse `scraper/src/shared/schema.ts`'s existing lat/lng bounds rather than RESEARCH's tighter example.

**Risk Assessment: HIGH.** This is the foundation plan — the missing RLS policy and the two missing dependencies are all one-way or costly to retrofit once Plans 02-04 build on top of them, and one of the gaps (owner-hidden-row RLS) breaks a phase success criterion (MOD-03) that three plans later assume is solved.

---

### 03-02-PLAN.md — In-app DM + safety modal/banner

**Summary:** The messaging schema and RLS design (participant-only SELECT, `buyer_user_id = auth.uid()` on insert) is sound and matches the established `persist.ts`-style patterns. The main gap is the unhandled 409-on-reopen case, which will surface immediately in manual testing (tap Contatta twice on the same listing).

**Strengths:**
- Conversation `unique(listing_id, buyer_user_id)` + participant-only RLS (`conversation_select_participant`, `message_select_participant`) is a correct, minimal-surface design — matches the existing RLS style already used in `004_listings_public_read_rls.sql`.
- FCFS-notice design (read-only banner for a second buyer) is a reasonable, low-complexity interpretation of D-75.
- Poll interval (10s) reuses the exact `useListingsPoll.ts:32-37` `setInterval`/cleanup pattern already proven in the codebase — low implementation risk.
- Self-DM rejection (`owner_user_id === buyer`) is explicitly called out.

**Concerns:**
- **MEDIUM** — 409-on-duplicate-conversation has no client recovery path (cross-cutting finding above). Since "Contatta" is the primary UGC detail CTA and will be tapped repeatedly across sessions, this isn't a rare edge case.
- **LOW** — `components/ui/drawer.tsx:40` hardcodes `bottom-16` unconditionally in the base `DrawerContent` primitive (not device-conditional). The UI-SPEC's "bottom-16 on mobile" framing implies a responsive override; worth confirming the `className` override actually differs at desktop breakpoints rather than assuming it "just works" from the shared primitive.
- **LOW** — Depends on Plan 01's `AuthPromptModal`/Dialog primitive existing and buildable; if Plan 01's missing `@radix-ui/react-dialog` isn't caught, this plan inherits the build failure.

**Suggestions:**
- On 409, have `POST /api/messages/conversations` fetch and return the existing conversation's id instead of a bare error (`select` before `insert`, or `on conflict do nothing returning id` pattern), so DmDrawer can always resume.
- Explicitly verify `DrawerContent`'s `bottom-16` positioning doesn't need a `sm:bottom-0` override for desktop centered-sheet framing described in UI-SPEC.

**Risk Assessment: MEDIUM.** Isolated, well-scoped feature; the one functional gap (reopen conversation) is straightforward to fix without touching schema.

---

### 03-03-PLAN.md — Community reports + auto-hide + owner hidden banner

**Summary:** This plan contains the review's most serious finding: the security-definer RPC design (`increment_listing_report`, `apply_listing_auto_hide`) is directly callable by any authenticated client via PostgREST, completely bypassing the report-threshold logic the Route Handler is supposed to enforce. It also depends on `getOwnerListingById` succeeding against an RLS surface that Plan 01 never grants (cross-cutting finding above), so MOD-03's UI half is unreachable even though the plan correctly designs the banner component itself.

**Strengths:**
- The 2-vs-3 threshold branching (`THRESHOLDS = { subito: 2, facebook: 2, ugc: 3 }`) is correctly source-aware, matching D-80/D-81 and Pitfall 6.
- `listing_reports` unique-per-reporter-per-listing constraint plus `report_insert_own` RLS check (`reporter_user_id = auth.uid()`) is a sound, minimal design for the insert path itself.
- Soft-mute via localStorage (`lib/reports/storage.ts`) correctly mirrors the proven `lib/favorites/storage.ts:5-26` pattern (parse-with-try/catch, dedicated key).
- `excludeReportedIds` wiring into both `MapExplorer` and `ListPageClient` closes the loop for D-84 client-side.

**Concerns:**
- **CRITICAL** — RPC exposure lets any authenticated user hide arbitrary listings or fabricate report counts without ever using the `/api/reports` route or the `listing_reports` table (cross-cutting finding above). This is a full bypass of MOD-02's anti-gaming design, not a minor gap.
- **HIGH** — `getOwnerListingById` (this plan's own artifact) cannot return hidden rows given the RLS state after migration 007 (cross-cutting finding above) — `HiddenReviewBanner` will never render for real.
- **MEDIUM** — the decision checkpoint text says "login required to report (no anonymous fingerprint UI in v1)" — consistent with `listing_reports`' `reporter_user_id` being effectively mandatory in practice, but the earlier migration 007 sketch (Plan 01, carried from RESEARCH) defines `listing_reports` with *both* `reporter_user_id` and a separate `reporter_fingerprint` unique constraint plus a check requiring at least one — Plan 03 doesn't reconcile whether that fingerprint column/constraint is being dropped or just unused. Minor inconsistency between the migration's actual shape and Plan 03's simplified auth-only model; worth an explicit column removal/no-op note so the fingerprint uniqueness constraint doesn't silently allow a second anonymous report path nobody intended.

**Suggestions:**
- Move the report/threshold check *inside* `apply_listing_auto_hide` and `increment_listing_report` (verify `exists (select 1 from listing_reports where listing_id = p_listing_id and reporter_user_id = auth.uid())` or similar), or restrict these functions so they can only be invoked as a side effect of a verified insert within the same transaction (e.g., a trigger on `listing_reports` insert rather than a directly-callable RPC).
- Fix the Plan 01 → Plan 03 RLS gap before this plan can deliver MOD-03 as scoped.
- Explicitly resolve the `reporter_fingerprint` column's fate given the "login required" decision.

**Risk Assessment: HIGH.** The RPC exposure issue is a genuine security hole in a public-facing moderation feature (this is exactly the kind of vulnerability that gets found and abused quickly on a small live platform), and the RLS gap silently breaks one of the phase's five listed success criteria.

---

### 03-04-PLAN.md — Street Dump + poster lifecycle + rate limits

**Summary:** Street Dump's GPS-seed-then-confirm design correctly avoids Pitfall 8 (no auto-publish), and the rate-limit module design is a clean, testable, DB-backed pure-function pattern consistent with the rest of the codebase. But this plan is where the two structural gaps from earlier plans surface as user-visible breakage: the owner-view branch on `UgcListingShell` has no `owner_user_id` to compare against, and `/post/manage` has no defined data source at all.

**Strengths:**
- Reuses the exact upload/create pipeline from Plan 01 for Street Dump rather than duplicating an API surface — good, avoids a second write path with different validation.
- `lib/ugc/status.ts` as pure functions (`mapReservedTransition`/`mapDeliveredTransition`) tested independently of the PATCH route is a good separation, matches the `lib/reports/auto-hide.ts` pure-function pattern used elsewhere.
- Rate-limit design (`assertCanPost`/`assertCanStartConversation` as DB count queries) is serverless-safe and testable via mocked Supabase responses, consistent with `lib/listings/queries.test.ts`'s existing mock style.
- Confirm-dialog-before-destructive-action for "mark delivered" (excludes from public feed) matches the UI-SPEC's Copywriting Contract exactly.

**Concerns:**
- **MEDIUM-HIGH** — `UgcListingShell` owner-view branch has no data source for `owner_user_id` (cross-cutting finding above); as written this comparison is either always false (Contatta never replaced by lifecycle buttons) or requires an unplanned extra fetch.
- **MEDIUM** — `/post/manage` / `ManageListingsClient` has no bulk owner-scoped query defined anywhere across the four plans, and `files_modified` for this plan doesn't touch `lib/listings/queries.ts` to add one.
- **LOW** — PATCH `app/api/ugc/listings/[id]/route.ts` relies on `ugc_update_own` RLS (`owner_user_id = auth.uid() and source = 'ugc'`) for authorization, which is fine for the UPDATE itself, but the route presumably needs to first SELECT the current listing to decide reserved-vs-delivered semantics or return a 404 for non-owned ids — same base-table SELECT RLS gap applies here if it needs to check current status before transitioning (e.g., to reject "mark delivered" on an already-hidden listing).

**Suggestions:**
- Add `owner_user_id` to `listings_public` (or introduce a separate authenticated-only owner query used specifically by the detail page when the viewer is logged in) so the owner-view branch has real data to key off.
- Define `getOwnerListings(userId)` in `lib/listings/queries.ts` explicitly as part of this plan's `files_modified`, and make sure it isn't blocked by the same RLS gap.

**Risk Assessment: MEDIUM-HIGH**, mostly inherited from Plans 01/03 rather than originating here — the Street Dump and rate-limit work itself is solid, but this is the plan where the missing-data-path problems become visible as broken owner UX (CONT-02/CONT-03's manage surface).

---

## Overall Assessment

The four plans correctly identify and sequence the phase's real integration risk (auth cookie fix, dual detail route, EXIF pipeline, threshold-branching moderation) and consistently reuse existing codebase patterns rather than inventing new ones — the tracer-first structure is the right call for a phase this wide.

The two issues I'd block on before execution:
1. **The RPC-exposure vulnerability in Plan 03** — a directly exploitable hole in a live moderation feature, not a theoretical one.
2. **The owner-scoped-read RLS gap originating in Plan 01** — silently breaks MOD-03 and degrades CONT-02/CONT-03's owner UI in Plan 04, and is exactly the kind of thing that's cheap to fix now (before migration 007 ships) and expensive to fix after (new migration + policy teardown, per the plans' own reversibility framework).

Both are fixable within Plan 01/03's existing migration files without changing scope or sequencing — they don't require replanning, just tightening the SQL before it's applied.

---

## Consensus Summary

*Note: Only Claude completed successfully (Gemini failed auth). Consensus reflects the single grounded reviewer.*

### Agreed Strengths

- Tracer-first sequencing (auth → upload → create → detail → DM → reports → Street Dump) correctly de-risks the highest-integration points before expanding scope
- Source-aware moderation thresholds (2 scraped / 3 UGC) align with locked decisions and Pitfall 6
- Consistent reuse of existing patterns: Route Handlers + Zod + RLS, `messages/it.ts` Italian chrome, Stitch UI porting, poll-based refresh matching `useListingsPoll`
- Real codebase landmines correctly identified: `setAll` no-op, hardcoded `source !== 'subito'` gate, claimed UGC excluded from public view

### Agreed Concerns (highest priority)

1. **CRITICAL — Plan 03 RPC exposure:** `increment_listing_report` and `apply_listing_auto_hide` granted to `authenticated` are directly callable via PostgREST, bypassing report dedup and threshold logic
2. **HIGH — Plan 01 missing owner SELECT RLS:** No policy for owners to read their own hidden/non-active listings; breaks MOD-03 end-to-end (detail route still reads `listings_public`)
3. **MEDIUM-HIGH — Plan 04 missing `owner_user_id` data path:** Owner lifecycle UI cannot determine ownership without exposing `owner_user_id` to authenticated queries
4. **MEDIUM — Plan 01 missing deps/prerequisites:** `@radix-ui/react-dialog` not installed; `ugc-photos` Storage bucket creation not specified
5. **MEDIUM — Plan 02 DM reopen gap:** 409 on duplicate conversation has no recovery path to resume existing thread

### Divergent Views

- N/A — single successful reviewer. Gemini unavailable (GOOGLE_CLOUD_PROJECT auth required).
