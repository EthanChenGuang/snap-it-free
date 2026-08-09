# Phase 06 — UI Review

**Audited:** 2026-08-04  
**Baseline:** `06-UI-SPEC.md` (Stitch scraper-dashboard contract)  
**Screenshots:** Partial — login redirect captured; authenticated admin routes verified via HTML audit + live E2E (operator session). Playwright auth cookies not persisted for full visual diff.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | zh chrome centralized in `admin-messages.ts`; minor EN drift in run status labels |
| 2. Visuals | 3/4 | Strong dashboard hierarchy + Material Symbols; mobile menu icon is non-functional |
| 3. Color | 3/4 | Monochrome tokens dominate; terminal `pre` blocks use hardcoded hex |
| 4. Typography | 2/4 | Contract caps 4 sizes × 2 weights; many `text-[12px]`/`text-[13px]` and one `font-bold` |
| 5. Spacing | 3/4 | `space-*` / `gutter` tokens used consistently; scattered arbitrary px values |
| 6. Experience Design | 3/4 | Skeletons + empty states present; mobile nav and header utility buttons incomplete |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Implement mobile sidebar navigation** — The `menu` icon in `AdminShell` (`md:hidden`) has no click handler or drawer; operators on tablet/phone cannot reach nav items. Add a Radix Sheet/Dialog restyled to Stitch tokens that mirrors the desktop sidebar links.

2. **Normalize typography to the 4-size contract** — Replace ~40 instances of `text-[12px]` and `text-[13px]` across admin clients with `text-label-sm` (14px per UI-SPEC mapping). Remove `font-bold` from `RunDetailClient.tsx:120` (use `font-semibold`). This aligns implementation with the approved cap and Stitch prototype intent.

3. **Replace hardcoded terminal colors with theme tokens** — `RejectsClient.tsx:184` and `RunDetailClient.tsx:136` use `bg-[#202020]` / `text-[#70c38a]`. Port to `bg-inverse-surface text-inverse-on-surface` (or add a documented `code-block` token in `@theme`) so log viewers stay monochrome-document-first without hex drift.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**PASS — centralized zh contract**

- All nav labels, CTAs, and empty states live in `components/admin/admin-messages.ts` with zh primary copy matching UI-SPEC §Copywriting (概览, 立即运行, 保存更改, etc.).
- No generic "Submit", "Click Here", or "No data" patterns found in `components/admin/**`.

**WARNING — English status strings in user-visible chrome**

- `SourceCard.tsx:27-30` — Last-run line uses English `Success` / `Failed` / `Partial` while UI-SPEC expects zh status chips (成功/失败/部分成功). Operators scanning cards see mixed locale.
- `DashboardClient.tsx:110` — Subtitle "Scraper Worker · Admin Console" is English-only; acceptable per D-34 for brand subtitle but duplicates sidebar copy without zh equivalent.

**WARNING — Footer label drift**

- `AdminShell.tsx:157` — "24h 新增" vs UI-SPEC "24h 入库". Minor semantics mismatch for operator metrics.

### Pillar 2: Visuals (3/4)

**PASS — hierarchy and icon system**

- Dashboard focal order matches UI-SPEC: global status row → source grid → recent alerts → footer stats (`DashboardClient.tsx:113-191`).
- Material Symbols Outlined throughout; zero `lucide-react` imports under `components/admin/`.
- Source cards use light-gray chips, thin borders, no drop shadows — matches Stitch monochrome aesthetic.

**WARNING — decorative mobile menu**

- `AdminShell.tsx:114-116` — Hamburger `menu` icon renders on `< md` breakpoints but is not a `<button>` and has no associated drawer. Mobile/tablet operators see only top bar title with no navigation affordance.

**WARNING — non-functional header actions**

- `AdminShell.tsx:131-147` — Notifications and Help icon buttons have `aria-label` but no `onClick` or routes. Acceptable for MVP if documented; otherwise misleading affordances.

**PASS — coming-soon visual treatment**

- `SourceCard.tsx:82-85,118-119` — `opacity-75`, disabled toggle, italic helper "该数据源尚未接入" matches prototype Facebook card pattern.

### Pillar 3: Color (3/4)

**PASS — 60/30/10 monochrome distribution**

- Dominant `bg-background` / `bg-surface`; secondary `surface-container-*` for chips and disabled cards; `bg-primary` (#000) reserved for Run now / Save CTAs per contract.
- No consumer `accent-orange` or saturated marketing colors in admin tree.
- Error used as text/icon only (`text-error`), not filled alert banners.

**WARNING — hardcoded hex in code blocks**

| File | Line | Pattern |
|------|------|---------|
| `RejectsClient.tsx` | 184 | `bg-[#202020] text-[#70c38a]` |
| `RunDetailClient.tsx` | 136 | `bg-[#202020] text-[#f1f1f1]` |

These bypass `@theme` tokens and violate workspace Stitch rule against hex drift.

**PASS — border-only elevation**

- Cards use `border border-outline-variant` without `shadow-*` classes across all admin clients.

### Pillar 4: Typography (2/4)

**PASS — Inter + semantic tokens in shell**

- `AdminShell` uses `text-h2`, `text-h3`, `text-label-md`, `text-label-sm` mapped to Inter 400/600.
- Page titles consistently `text-[30px] font-semibold` (headline contract).

**BLOCKER-adjacent — weight cap violation**

- `RunDetailClient.tsx:120` — `font-bold` (700) on metric values; UI-SPEC explicitly forbids weight 700 ("do not introduce weight 700").

**WARNING — 5th and 6th de facto font sizes**

- Grep count: 15+ `text-[12px]`, 10+ `text-[13px]`, 20+ `text-[20px]` (icon sizing OK) across admin clients.
- UI-SPEC §Typography: prototype 12px/13px must map to **label 14px** with de-emphasis via `text-secondary` — current arbitrary sizes break the 4-size cap and create visual inconsistency between Settings tables (12px headers) and Dashboard body (15px).

**WARNING — mixed token vs arbitrary sizing**

- Same screen uses both `text-label-sm` and `text-[12px]` (e.g. `SettingsClient.tsx:207` vs `:268`), suggesting incomplete token migration.

### Pillar 5: Spacing (3/4)

**PASS — grid and section rhythm**

- Dashboard grid: `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-space-lg` matches UI-SPEC.
- Shell: `w-64` sidebar, `h-16` top bar, `max-w-container-max`, `p-gutter` — aligned with `admin_dashboard/code.html`.
- Section breaks use `mb-space-xl` (48px) per spacing scale.

**WARNING — arbitrary spacing on form controls**

- Toggle pseudo-elements use pixel literals (`after:left-[2px]`, `h-6 w-10`) — acceptable for switch geometry but repeated copy-paste across 4 components (Dashboard, Settings, SourceCard, SourceDetail) suggests extracting a shared `AdminToggle` primitive.

**PASS — 4px grid mostly respected**

- Padding values cluster on 4px multiples (p-3=12, p-4=16, p-6=24 via space-lg).

### Pillar 6: Experience Design (3/4)

**PASS — state coverage**

| State | Evidence |
|-------|----------|
| Loading | `DashboardSkeleton`, `RejectsClient` skeleton rows, button `提交中…` / `disabled:opacity-50` |
| Empty | Runs, rejects, translation queue each have zh empty headings + body + optional CTA |
| Error | `DashboardLoadError`, settings save error banner, translation queue error strip |
| Disabled | Coming-soon cards, global pause disables Run now, allowlist self-delete guards |

**WARNING — silent API failures**

- `DashboardClient.tsx:52-54` — Global pause PATCH failure returns early with no user-visible error (toggle snaps back only if state unchanged).
- `SourceDetailClient` / `SettingsClient` — similar pattern on failed save (no toast).

**WARNING — export affordance disabled without explanation**

- `RejectsClient.tsx:76-78` — Export button rendered with `opacity-60` and no `disabled` attribute or tooltip; looks broken rather than intentionally deferred.

**WARNING — mobile navigation gap**

- Same as Visuals pillar: no responsive nav sheet blocks complete operator workflows on narrow viewports.

---

## Registry Safety

Skipped — `shadcn_initialized: false` in UI-SPEC; no third-party registry blocks installed for admin surface.

---

## Screenshots

| File | Description |
|------|-------------|
| `.planning/ui-reviews/06-20260804/login-redirect.png` | Unauthenticated `/admin` → consumer `/post` redirect (auth gate visual) |

Authenticated route HTML verified programmatically during Phase 6 UAT (all 6 admin routes 200, Material Symbols + zh labels present).

---

## Files Audited

- `components/admin/AdminShell.tsx`
- `components/admin/DashboardClient.tsx`
- `components/admin/SourceCard.tsx`
- `components/admin/SourcesListClient.tsx`
- `components/admin/SourceDetailClient.tsx`
- `components/admin/RunsListClient.tsx`
- `components/admin/RunDetailClient.tsx`
- `components/admin/RejectsClient.tsx`
- `components/admin/TranslationQueueClient.tsx`
- `components/admin/SettingsClient.tsx`
- `components/admin/admin-messages.ts`
- `app/admin/**` (8 routes)
- `.planning/phases/06-scraper-admin-console-configurable-sources-frequency-anti-bl/06-UI-SPEC.md`
- `.planning/google-stitch-ui-design/scraper-dashboard/admin_dashboard/code.html`
- `.planning/google-stitch-ui-design/scraper-dashboard/DESIGN.md`
