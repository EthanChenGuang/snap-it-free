---
phase: featured-picks
plan: 04
type: execute
wave: 2
depends_on: ["01"]
files_modified:
  - app/admin/featured/page.tsx
  - components/admin/FeaturedReviewClient.tsx
  - app/api/admin/featured/[id]/route.ts
  - app/api/admin/featured/[id]/route.test.ts
  - components/admin/AdminShell.tsx
  - components/admin/admin-messages.ts
autonomous: false
requirements: [FEAT-01, FEAT-03]
user_setup: []
must_haves:
  truths:
    - "/admin/featured shows pending candidates one at a time with original photo and studio image side by side"
    - "通过 sets status=approved; 不要 sets status=rejected; both record reviewed_at/reviewed_by"
    - "non-operators get 401/403 from the API route and cannot view the page"
    - "the page is usable one-handed on a 390 px wide phone (buttons ≥ 44 px, no horizontal scroll)"
  artifacts:
    - app/admin/featured/page.tsx
    - app/api/admin/featured/[id]/route.ts
  key_links:
    - "FeaturedReviewClient → POST /api/admin/featured/[id] {decision} → featured_candidates update (service role)"
---

<objective>
Phone-first review page in the operator console.
</objective>

<context>
@docs/explore/premium-listing-photos/featured-picks-CONTEXT.md
@lib/admin/require-operator.ts
@components/admin/AdminShell.tsx
@components/admin/admin-messages.ts
@app/admin/rejects/page.tsx
</context>

<tasks>
<task type="auto">
  <name>Task 1: API route with operator gate</name>
  <files>app/api/admin/featured/[id]/route.ts, route.test.ts</files>
  <action>
  `POST { decision: 'approve' | 'reject' }` validated with zod. Gate with the route-handler helper from
  `require-operator.ts`. Update only rows currently `pending` (`.eq('status','pending')`) to avoid double
  decisions; return the new status. Reject also removes the storage object.
  </action>
  <verify>`npx vitest run app/api/admin/featured`</verify>
  <acceptance_criteria>
    - tests: unauthenticated → 401, non-operator → 403, invalid body → 400, approve/reject happy paths
  </acceptance_criteria>
  <done>Route tested.</done>
</task>

<task type="auto">
  <name>Task 2: Review page (mobile-first)</name>
  <files>app/admin/featured/page.tsx, components/admin/FeaturedReviewClient.tsx, AdminShell.tsx, admin-messages.ts</files>
  <action>
  Server page loads pending candidates (service role) grouped by city with counts. Client shows one card:
  studio image on top, original (watermark-free `card-desktop-new-small-4x-auto` preset — never the raw
  gallery URL) below, title + city, two full-width buttons 不要 / 通过 (≥ 48 px), optional swipe gesture,
  optimistic advance with undo for 5 s. Empty state: "今天没有待审核的候选". Add nav item 今日精选 with
  pending count badge. Chinese strings in `admin-messages.ts`.
  </action>
  <verify>`npx vitest run components/admin`; Playwright screenshot at 390×844.</verify>
  <acceptance_criteria>
    - original photo URL passes through `normalizeSubitoPhotoUrl` (watermark-free)
    - no element wider than viewport at 390 px
  </acceptance_criteria>
  <done>Page built.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Review page on the Vercel preview of `claude/featured-picks`.</what-built>
  <how-to-verify>On your phone open {preview}/admin/featured, approve one and reject one candidate.</how-to-verify>
  <resume-signal>"approved" or describe issues</resume-signal>
</task>
</tasks>

<threat_model>
| Threat | Mitigation |
|---|---|
| Non-operator approves picks | operator gate on page and route; service role only server-side |
| CSRF on decision route | same-origin POST with JSON content-type check; Supabase auth cookie SameSite |
| Watermarked original shown in admin | original rendered through watermark-free preset |
| Double-tap races | update guarded by `status = 'pending'` |
</threat_model>

<verification>
- [ ] `npx vitest run app/api/admin/featured components/admin`
- [ ] `npx tsc --noEmit` — no new errors
</verification>
