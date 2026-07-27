# Codebase Structure

**Analysis Date:** 2026-07-27

## Directory Layout

```
shou-man-wu/
├── index.html                    # HTML shell: fonts, #root mount, Vite entry
├── package.json                  # npm scripts, React/Vite/Tailwind deps
├── vite.config.ts                # Vite + React + Tailwind plugins, @ alias
├── tsconfig.json                 # TypeScript: ES2022, react-jsx, @/* paths
├── metadata.json                 # AI Studio app metadata (name, geolocation)
├── README.md                     # AI Studio run instructions
├── .env.example                  # GEMINI_API_KEY, APP_URL placeholders (not wired)
├── assets/                       # AI Studio asset folder (.aistudio/)
├── src/                          # React application (implementation)
│   ├── main.tsx                  # React DOM entry
│   ├── App.tsx                   # Root container: state, routing, persistence
│   ├── types.ts                  # Domain TypeScript interfaces
│   ├── index.css                 # Tailwind v4 @theme tokens + global styles
│   ├── components/               # View components (one screen each)
│   │   ├── Header.tsx
│   │   ├── BottomNav.tsx
│   │   ├── ListView.tsx
│   │   ├── MapView.tsx
│   │   ├── ItemDetailView.tsx
│   │   ├── PostItemView.tsx
│   │   ├── SettingsView.tsx
│   │   └── ChatModal.tsx
│   └── data/
│       └── initialItems.ts       # Mock Item[] and Zone[] seeds
└── .planning/                    # GSD planning artifacts (not bundled)
    ├── PROJECT.md                # Product definition, requirements
    ├── REQUIREMENTS.md           # Requirement IDs
    ├── ROADMAP.md                # Phase roadmap
    ├── google-stitch-ui-design/  # Stitch static HTML + DESIGN.md tokens
    │   ├── DESIGN.md
    │   ├── listing_feed_notion_style/code.html
    │   ├── map_explorer_notion_style/code.html
    │   ├── item_details_notion_style/code.html
    │   ├── post_free_item_notion_style/code.html
    │   └── setting_notion_style/code.html
    ├── research/                 # Target architecture research (future stack)
    ├── phases/                   # Per-phase plans, UI specs, skeletons
    └── codebase/                 # Codebase map outputs (this directory)
```

## Directory Purposes

**`src/` (runtime application):**
- Purpose: All code bundled and served by Vite
- Contains: React TSX/TS, global CSS, mock data
- Key files: `src/App.tsx`, `src/types.ts`, `src/components/*.tsx`, `src/data/initialItems.ts`

**`src/components/`:**
- Purpose: Screen-level UI components matching Stitch designs
- Contains: One component per major view + shell (Header, BottomNav) + ChatModal
- Key files: See Stitch mapping in `ARCHITECTURE.md`

**`src/data/`:**
- Purpose: Static seed data for prototype/demo sessions
- Contains: `initialItems.ts` exporting `INITIAL_ITEMS`, `INITIAL_ZONES`
- Key files: `src/data/initialItems.ts`

**`.planning/google-stitch-ui-design/`:**
- Purpose: Design system reference and static HTML prototypes from Google Stitch
- Contains: `DESIGN.md` (YAML frontmatter tokens + markdown spec), five screen folders with `code.html`
- Key files: `.planning/google-stitch-ui-design/DESIGN.md`

**`.planning/` (planning root):**
- Purpose: Product requirements, roadmap, phase plans, research — consumed by GSD workflows
- Contains: Markdown specs, phase subdirectories, research cache
- Key files: `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/research/ARCHITECTURE.md`

**Root config files:**
- Purpose: Build tooling and AI Studio boilerplate
- Contains: Vite, TypeScript, npm manifest, env template
- Key files: `vite.config.ts`, `tsconfig.json`, `package.json`

## Key File Locations

**Entry Points:**
- `index.html`: Browser document; loads Inter + Material Symbols fonts
- `src/main.tsx`: Creates React root, imports `App` and `index.css`
- `src/App.tsx`: Application root component and state owner

**Configuration:**
- `vite.config.ts`: Plugins (React, Tailwind v4), `@` path alias to repo root, HMR disable flag for AI Studio
- `tsconfig.json`: Strict-enough defaults; `noEmit: true` (Vite handles emit)
- `package.json`: Scripts — `dev` (port 3000), `build`, `preview`, `lint` (tsc --noEmit)
- `.env.example`: Documents `GEMINI_API_KEY` and `APP_URL` — no runtime usage in current `src/`

**Core Logic:**
- `src/App.tsx`: Tab routing, CRUD handlers, localStorage sync, chat simulation
- `src/types.ts`: `Item`, `Zone`, `Owner`, `AppSettings`, `ChatMessage`, `NavTab`, `Category`
- `src/data/initialItems.ts`: 11 demo items, 2 demo zones

**Presentation:**
- `src/components/ListView.tsx`: Feed/grid view (default tab)
- `src/components/MapView.tsx`: Map + bottom sheet (planned product home per PROJECT.md)
- `src/components/ItemDetailView.tsx`: Item detail pseudo-route
- `src/components/PostItemView.tsx`: UGC post form
- `src/components/SettingsView.tsx`: Settings, zones, language
- `src/components/ChatModal.tsx`: DM overlay (not in Stitch designs)
- `src/components/Header.tsx`, `src/components/BottomNav.tsx`: App chrome

**Styling:**
- `src/index.css`: Tailwind `@import`, `@theme` color/font tokens, scrollbar/notion-input utilities

**Design Reference (non-runtime):**
- `.planning/google-stitch-ui-design/DESIGN.md`: Color, typography, spacing, component rules
- `.planning/google-stitch-ui-design/*/code.html`: Static Tailwind CDN prototypes per screen

**Testing:**
- Not detected — no `*.test.*`, `*.spec.*`, or test runner config

## Naming Conventions

**Files:**
- React components: PascalCase + `View` or role suffix — `ListView.tsx`, `ChatModal.tsx`, `Header.tsx`
- Data/modules: camelCase — `initialItems.ts`, `types.ts`
- Config: standard tooling names — `vite.config.ts`, `tsconfig.json`
- Stitch design folders: snake_case screen slug + `_notion_style` — `map_explorer_notion_style/`

**Directories:**
- `src/components/`: flat — no subfolders per feature
- `.planning/google-stitch-ui-design/`: one folder per screen, each containing `code.html`
- `.planning/phases/`: `{NN}-{phase-slug}/` with plan/research/spec markdown files

**Functions:**
- Event handlers in App: `handle` prefix — `handleSelectItem`, `handleClaimItem`, `handleSendMessage`
- Props callbacks: `on` prefix — `onSelectItem`, `onPostSuccess`, `onTabChange`

**Types:**
- Interfaces: PascalCase nouns — `Item`, `AppSettings`, `ChatMessage`
- Union types: PascalCase — `NavTab`, `Category`, `ItemCondition`
- String literal enums inline in types, not TypeScript `enum` keyword

**CSS / Tailwind:**
- Utility-first inline classes in JSX
- Custom utilities in `index.css`: `.notion-input`, `.notion-border`, `.custom-dashed`, `.no-scrollbar`
- Theme tokens in `@theme` block use kebab-case CSS variables — `--color-accent-orange`

**localStorage keys:**
- Prefix `shoumanwu_` + snake entity — `shoumanwu_items`, `shoumanwu_zones`, `shoumanwu_settings`, `shoumanwu_messages`

## Where to Add New Code

**New screen / view:**
- Implementation: `src/components/{Name}View.tsx` (follow existing `*View.tsx` pattern)
- Register tab: extend `NavTab` in `src/types.ts`, add conditional render + nav item in `src/App.tsx` and optionally `src/components/BottomNav.tsx`
- Design reference: add Stitch HTML under `.planning/google-stitch-ui-design/{screen}_notion_style/code.html`

**New shared UI primitive (button, card, chip):**
- Not applicable yet — no `src/components/ui/` directory. Current pattern inlines Tailwind in view components. When adopting shadcn/ui (planned Phase 2 per `.planning/phases/01-scraper-foundation-listing-data-model/01-UI-SPEC.md`), use `src/components/ui/` per research stack.

**New domain type or field:**
- Types: `src/types.ts`
- Mock instances: `src/data/initialItems.ts`
- If persisted: add localStorage key + hydrate/persist `useEffect` in `src/App.tsx`

**New data-fetch / API hook (future backend):**
- Planned location per research: `lib/` or `src/hooks/` — neither exists yet
- Create `src/hooks/` for client data hooks when Supabase/API is wired; keep components presentational

**Scraper / ingestion worker (future):**
- Not in `src/` — planned as separate deployable per `.planning/research/ARCHITECTURE.md`
- Phase 1 skeleton referenced in `.planning/phases/01-scraper-foundation-listing-data-model/SKELETON.md`

**i18n strings (future):**
- Currently hardcoded in components; only nav labels react to `settings.language`
- Planned: locale message files + `[locale]` routing per `.planning/research/ARCHITECTURE.md`

**Tests (when added):**
- Co-located or parallel: `src/components/ListView.test.tsx` or `src/__tests__/`
- No existing convention — establish alongside first test framework choice (Vitest likely, given Vite)

**Planning / design docs:**
- Product: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`
- UI tokens: `.planning/google-stitch-ui-design/DESIGN.md`
- Codebase maps: `.planning/codebase/*.md`

## Special Directories

**`.planning/`:**
- Purpose: GSD workflow artifacts — requirements, roadmap, phase plans, research, UI design exports
- Generated: Mix — some agent-generated, some human-authored
- Committed: Yes (tracked in git)

**`.planning/google-stitch-ui-design/`:**
- Purpose: Stitch export reference; not imported by Vite build
- Generated: Yes (Google Stitch)
- Committed: Yes — treat as design source of truth alongside `DESIGN.md`

**`assets/.aistudio/`:**
- Purpose: AI Studio internal asset metadata
- Generated: Yes
- Committed: Partial (`.gitignore` inside)

**`dist/` (build output):**
- Purpose: Production bundle from `npm run build`
- Generated: Yes
- Committed: No (standard Vite output, removed by `npm run clean`)

**`.planning/research/.cache/`:**
- Purpose: Cached research agent JSON responses
- Generated: Yes
- Committed: Likely yes in current repo — not part of runtime

## Stitch ↔ Implementation Quick Reference

| Add or change… | Stitch reference | Implementation target |
|----------------|------------------|------------------------|
| Feed card layout | `listing_feed_notion_style/code.html` | `src/components/ListView.tsx` |
| Map + bottom sheet | `map_explorer_notion_style/code.html` | `src/components/MapView.tsx` |
| Detail page layout | `item_details_notion_style/code.html` | `src/components/ItemDetailView.tsx` |
| Post form | `post_free_item_notion_style/code.html` | `src/components/PostItemView.tsx` |
| Settings / zones | `setting_notion_style/code.html` | `src/components/SettingsView.tsx` |
| Color / type tokens | `DESIGN.md` | `src/index.css` `@theme` block |
| App title / fonts | All Stitch HTML `<head>` | `index.html` |

---

*Structure analysis: 2026-07-27*
