# Technology Stack

**Analysis Date:** 2026-07-27

## Languages

**Primary:**
- TypeScript ~5.8.2 — All application logic in `src/` (`*.ts`, `*.tsx`); strict bundler module resolution via `tsconfig.json`
- CSS — Tailwind v4 utility classes and design tokens in `src/index.css` (`@import "tailwindcss"`, `@theme { ... }`)

**Secondary:**
- HTML — Entry shell in `index.html`; static UI reference prototypes in `.planning/google-stitch-ui-design/*/code.html`
- JSON — App metadata in `metadata.json`; planning config in `.planning/config.json`

## Runtime

**Environment:**
- Node.js — Required for local dev and build (stated in `README.md`; no `.nvmrc` or `engines` field pins a version)
- Browser (ES2022 target) — Client-only SPA; no server-side rendering

**Package Manager:**
- npm — Scripts and dependency declarations in `package.json`
- Lockfile: **missing** — No `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` detected; reproducible installs are not locked

## Frameworks

**Core:**
- React 19.0.1 — UI framework; single-page app mounted from `src/main.tsx` → `src/App.tsx`
- Vite 6.2.3 — Dev server, HMR, and production bundler; config in `vite.config.ts`
- Tailwind CSS 4.1.14 — Styling via `@tailwindcss/vite` plugin; design tokens aligned with `.planning/google-stitch-ui-design/DESIGN.md`

**Testing:**
- Not detected — No test runner, test files (`*.test.*`, `*.spec.*`), or test config

**Build/Dev:**
- Vite 6.2.3 — `npm run dev` (port 3000, host `0.0.0.0`), `npm run build`, `npm run preview`
- TypeScript ~5.8.2 — Type-check only via `npm run lint` (`tsc --noEmit`)
- esbuild 0.25.0 — Transitive build tool (via Vite)
- tsx 4.21.0 — Dev dependency; no server entry script present in repo
- autoprefixer 10.4.21 — Dev dependency; PostCSS config not present (Tailwind Vite plugin handles CSS pipeline)

## Key Dependencies

**Critical (used in `src/`):**
- `react` / `react-dom` ^19.0.1 — Component tree, hooks, client state in `src/App.tsx` and `src/components/*`
- `@tailwindcss/vite` ^4.1.14 + `tailwindcss` ^4.1.14 — Utility-first styling; `@theme` tokens in `src/index.css`
- `@vitejs/plugin-react` ^5.0.4 — JSX/TSX transform and Fast Refresh

**Declared but unused in `src/`:**
- `lucide-react` ^0.546.0 — Listed in `package.json`; icons use Google Material Symbols via CDN in `index.html` instead
- `motion` ^12.23.24 — Listed in `package.json`; no imports in application code
- `@google/genai` ^2.4.0 — AI Studio boilerplate dependency; no Gemini API calls in `src/`
- `express` ^4.21.2 — Listed in `package.json`; no `server.js` or API route files exist (`npm run clean` references `server.js` but file is absent)
- `dotenv` ^17.2.3 — Listed in `package.json`; no server-side entry loads it

**Infrastructure:**
- Not applicable in current codebase — No database client, ORM, map SDK, auth SDK, or scraper packages installed

## Configuration

**Environment:**
- `.env.example` — Documents `GEMINI_API_KEY` and `APP_URL` (Google AI Studio secrets pattern)
- `.env*` files gitignored per `.gitignore` (except `.env.example`)
- `DISABLE_HMR` — Optional env var read in `vite.config.ts` to disable HMR/file watching (AI Studio agent-edit mode)
- Application state persisted in browser `localStorage` keys: `shoumanwu_items`, `shoumanwu_zones`, `shoumanwu_settings`, `shoumanwu_messages` (`src/App.tsx`)

**Build:**
- `vite.config.ts` — React + Tailwind plugins; path alias `@` → project root
- `tsconfig.json` — ES2022, `moduleResolution: "bundler"`, JSX `react-jsx`, path alias `@/*`
- `index.html` — Vite entry, Google Fonts CDN links, `#root` mount point
- `metadata.json` — AI Studio app metadata: name `手慢无`, geolocation permission, `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`

**Linting/Formatting:**
- Not detected — No ESLint, Prettier, or Biome config files

## Platform Requirements

**Development:**
- Node.js + npm
- `npm install` then `npm run dev` → http://localhost:3000
- Optional: `GEMINI_API_KEY` in `.env.local` per `README.md` (for AI Studio hosting; unused by current UI-only draft)

**Production:**
- **Current draft:** Static SPA build via `npm run build` → `dist/` (standard Vite output)
- **Planned (per `.planning/research/STACK.md`, not implemented):** Next.js on Vercel + Supabase + separate Crawlee/Playwright scraper worker — the repo remains a Vite/React prototype until migration

## Design Reference (Non-Runtime)

**Google Stitch UI designs:**
- Location: `.planning/google-stitch-ui-design/`
- `DESIGN.md` — Structured Minimalist design system (Inter typography, monochrome palette, 4px grid)
- Screen prototypes: `map_explorer_notion_style/`, `listing_feed_notion_style/`, `item_details_notion_style/`, `post_free_item_notion_style/`, `setting_notion_style/` — static HTML + Tailwind CDN (reference only, not bundled into Vite app)

**Google AI Studio origin:**
- Draft generated from AI Studio (`README.md` links to `https://ai.studio/apps/0c669d83-7fee-4e75-9d51-0b30a3b5fce5`)
- Package name still `react-example` in `package.json` (AI Studio default, not renamed)

## Application Architecture (Current)

| Layer | Technology | Location |
|-------|------------|----------|
| Entry | Vite + React 19 | `index.html`, `src/main.tsx` |
| App shell / routing | Tab state (`NavTab`) | `src/App.tsx` |
| Views | React components | `src/components/*.tsx` |
| Types | TypeScript interfaces | `src/types.ts` |
| Mock data | Static arrays | `src/data/initialItems.ts` |
| Persistence | Browser `localStorage` | `src/App.tsx` |
| Map UI | SVG grid + static background image (no map SDK) | `src/components/MapView.tsx` |
| Chat | Simulated in-memory + `setTimeout` auto-reply | `src/App.tsx`, `src/components/ChatModal.tsx` |

## PWA / Service Worker

- Not detected — No `manifest.json`, service worker, or Serwist/next-pwa configuration
- `metadata.json` requests geolocation permission (AI Studio) but `src/` does not call `navigator.geolocation` yet

---

*Stack analysis: 2026-07-27*
