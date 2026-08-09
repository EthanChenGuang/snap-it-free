# Google Stitch Prompt — Phase 8: Subito Regalo URL Matrix

Copy the **Prompt (English)** block below into Google Stitch.

**Visual baseline (match exactly):**
- Admin: `.planning/google-stitch-ui-design/scraper-dashboard/source_detail_subito/code.html` — extend this screen; same sidebar, breadcrumb, form sections, sticky footer
- Admin tokens: `.planning/google-stitch-ui-design/scraper-dashboard/DESIGN.md`
- Consumer: `.planning/google-stitch-ui-design/map_explorer_notion_style/code.html` — zone chips + bottom drawer cards
- Global tokens: `.planning/google-stitch-ui-design/DESIGN.md`

**Decisions source:** `.planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-CONTEXT.md`

---

## Prompt (English — paste into Stitch)

```
Design UI updates for Phase 8 of "手慢无 (ShouManWu)" — Venice free-items app. Phase 8 adds (A) a Subito URL matrix on the operator admin source detail page and (B) Subito category filters + location/category badges on the consumer map feed.

IMPORTANT: This is an EXTENSION of existing Stitch prototypes — do NOT invent a new visual language. Match scraper-dashboard/source_detail_subito and map_explorer_notion_style pixel-for-pixel on tokens, spacing, borders, typography.

DESIGN SYSTEM (strict — same as Phase 6 admin + consumer):
- Structured Minimalist / Notion-adjacent monochrome document UI
- Inter font, Material Symbols Outlined icons
- Surfaces: #f9f9f8 / white; borders: thin #e5e5e5 / outline-variant; NO card drop shadows (except existing map floating search subtle border)
- Primary button: black fill (#000), white text
- Secondary/chips/badges: light gray #f1f1f0 or white with thin border
- Selected chip: black fill, white text (same as existing "All Areas" chip)
- 4px spacing grid; form sections separated by thin horizontal rules inside one bordered container (NOT floating shadow cards)
- Desktop admin: 1440px with left sidebar nav (Dashboard, Sources, Runs, Translation, Settings) — identical to source_detail_subito

REFERENCE SCREENS TO CLONE STRUCTURE FROM:
1) scraper-dashboard/source_detail_subito — admin layout, Enabled toggle, Interval stepper, Target URLs textarea, Anti-block 3-option cards, validation info panel, sticky Save + Run now footer
2) map_explorer_notion_style — map canvas, floating search, zone chip row, bottom drawer listing cards with zone label above title

---

SCREENS TO GENERATE (separate folder per screen, each with code.html):

### SCREEN 1: source_detail_subito_matrix (desktop 1440px)
Route: /admin/sources/subito — REPLACES the plain "Target URLs" section with hybrid matrix + textarea.

Keep unchanged from source_detail_subito:
- Side nav, breadcrumb "Sources > Subito", page title "Subito Configuration"
- Source Status toggle, Run Interval stepper (90 min), Anti-block preset row, Validation thresholds info panel
- Sticky footer: [Save changes] [Run now]

NEW section — insert ABOVE the Target URLs textarea, inside the same bordered form container, as a new bordered subsection titled "Regalo URL matrix":

**A) Cities row (checkboxes, both checked by default):**
- ☐ Venezia (comune venezia/venezia)
- ☐ Padova (comune padova/padova)

**B) Categories grid (checkboxes, all checked by default) — 2 columns on desktop, 1 on narrow; Italian labels ONLY (slug in muted tooltip/subtitle):**
1. Arredamento e Casalinghi
2. Elettrodomestici
3. Tutto per i bambini
4. Abbigliamento e Accessori
5. Libri e Riviste
6. Informatica
7. Giardino e Fai da te
8. Sports
9. Collezionismo
10. Biciclette
11. Audio/Video
12. Telefonia
13. Musica e Film
14. Fotografia
15. Console e Videogiochi
16. Animali
17. Tutte le categorie (usato)

Row actions below grid:
- [Generate URLs] (secondary/outline button) — populates textarea from checked cities × categories
- [Apply recommended seed] (primary/black button) — fills full 34-URL preset (17 categories × 2 cities)

**C) Status line (below actions, label-sm muted):**
"34 URLs selected · Template: /annunci-veneto/regalo/{slug}/{city}/{city}/"

**D) Future hint (one line, info icon, surface-container-low background):**
"More Italian regions coming later — URL template also supports annunci-{region}/regalo/…"

**E) Warning banner state (show inline, non-blocking, amber-adjacent text on light #f1f1f0 — NOT bright yellow box):**
"34 URLs selected — expect a longer scrape run. Anti-block Standard preset recommended."

**F) Target URLs textarea (KEEP below matrix):**
- Label: "Target URLs"
- Helper: "One URL per line. Edit manually or use the matrix above."
- Show 3–4 sample lines in monospace:
  https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/
  https://www.subito.it/annunci-veneto/regalo/informatica/padova/padova/
  (etc.)

Matrix helper links: "Select all categories" · "Clear categories" (text links, not buttons)

---

### SCREEN 2: source_detail_subito_confirm_overwrite (desktop 1440px)
Same page as Screen 1 but with a centered modal dialog (thin border, no shadow blur backdrop — use semi-transparent #1a1c1c/40 overlay):

Title: "Replace target URLs?"
Body: "Replace current 3 URLs with the recommended 34-URL seed (Venezia + Padova × all regalo categories)?"
Actions: [Cancel] (outline) · [Replace URLs] (primary black)

Show dimmed matrix behind modal.

---

### SCREEN 3: map_explorer_category_filters (mobile 390px + desktop 1440px)
Extend map_explorer_notion_style — SAME map, search bar, zone chips, bottom drawer.

**Zone chip row (unchanged — row 1):**
Tutte · Centro Storico · Mestre · Lido
(Tutte selected = black fill)

**NEW row 2 — Subito category chips (horizontal scroll, no visible scrollbar):**
Label above row (label-sm muted): "Categoria"
Chips (Italian, pill shape, same style as zone chips):
- Tutte (selected, black)
- Arredamento e Casalinghi
- Elettrodomestici
- Tutto per i bambini
- Abbigliamento e Accessori
- Libri e Riviste
- Informatica
- Giardino e Fai da te
- Sports
- Collezionismo
- Biciclette
- Audio/Video
- Telefonia
- Musica e Film
- Fotografia
- Console e Videogiochi
- Animali
- Tutte le categorie

Show row 2 partially scrolled on mobile to imply overflow.

**Bottom drawer cards — update metadata lines:**
Card A (Venice):
- Zone label: "CENTRO STORICO" (uppercase label-sm secondary)
- Category badge chip on same row or below title: "Arredamento e Casalinghi" (#f1f1f0 chip)
- Title: "Divano a tre posti in buono stato"
- Subito source badge if space

Card B (Padova — NEW pattern):
- Location label: "PADOVA" (not a Venice zone — same typography as zone label)
- Category badge: "Informatica"
- Title: "Monitor 24 pollici regalo"
- Map pin for Padova shown faintly west of Venice on map (optional subtle second pin)

Card C:
- "MESTRE" zone + "Libri e Riviste" category badge

Do NOT change map default center — still Venice-centered; Padova pin is off to the west.

---

### SCREEN 4: listing_feed_category_filters (mobile 390px)
Extend listing_feed_notion_style for the /list or Elenco full-page view.

Same dual chip rows as Screen 3 (zone row + category row).
Listing grid cards show:
- Category badge (Italian Subito label, #f1f1f0)
- Title + Free
- Location line with location_on icon: either zone name (Centro Storico) OR city name (Padova) when no Venice zone

Include at least one Padova card and one Venice card with category badges visible.

---

STATES & EDGE CASES TO SHOW:
- Admin Screen 1: default (34 selected, warning visible, textarea populated)
- Admin Screen 2: overwrite confirm modal
- Consumer Screen 3: category chip "Informatica" selected (black) with filtered drawer feel
- Consumer Screen 4: "Tutte" category + mixed Venice/Padova cards

DO NOT USE:
- rounded-xl/2xl cards, glassmorphism, purple/blue shadcn defaults, saturated accent colors
- Disabled national region dropdown (hint text only)
- New navigation items in admin sidebar
- Pagination UI for categories

OUTPUT:
- Clean HTML + Tailwind per screen folder under scraper-dashboard/ (admin screens) and root google-stitch-ui-design/ (consumer screens)
- Folder names: source_detail_subito_matrix, source_detail_subito_confirm_overwrite, map_explorer_category_filters, listing_feed_category_filters
- Include screen.png thumbnail per folder if Stitch supports export
```

---

## Prompt (中文摘要 — 给 operator 阅读)

Phase 8 Stitch 原型，**延续**现有 scraper-dashboard 与 map_explorer 风格：

**运营后台** (`/admin/sources/subito`)：
- 在原有 Subito 配置页上增加 **城市 × regalo 分类** 复选框矩阵（Venezia + Padova；17 个意大利语分类）
- 按钮：Generate URLs、Apply recommended seed（34 条 URL）
- 显示已选 URL 数量、URL 模板说明、≥30 条时的非阻塞警告
- 保留下方 Target URLs 文本框；确认覆盖对话框

**用户端**（地图 + Elenco）：
- 在现有 ** zona ** 筛选 Chip 下方新增第二行 **Subito 分类** Chip（17 个 + Tutte，横向滚动）
- 列表卡片显示 **分类 badge**（意大利语）和 **Padova** 城市标签（非 Venice zone）

---

## After Stitch

Save prototypes to:

```
.planning/google-stitch-ui-design/scraper-dashboard/source_detail_subito_matrix/
.planning/google-stitch-ui-design/scraper-dashboard/source_detail_subito_confirm_overwrite/
.planning/google-stitch-ui-design/map_explorer_category_filters/
.planning/google-stitch-ui-design/listing_feed_category_filters/
```

Then: `/gsd-plan-phase 8` or `/gsd-ui-phase 8` — port prototypes to `SourceDetailClient.tsx`, map drawer, and Elenco.

---

*Prompt version: 1.0 — 2026-08-05 (Phase 8, 4 screens)*
