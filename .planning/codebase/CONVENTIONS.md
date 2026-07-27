# Coding Conventions

**Analysis Date:** 2026-07-27

## Naming Patterns

**Files:**
- React view components: PascalCase + `.tsx` in `src/components/` (e.g., `ListView.tsx`, `ItemDetailView.tsx`)
- Shared types: singular `src/types.ts` at the `src/` root
- Static seed/mock data: camelCase in `src/data/` (e.g., `initialItems.ts`)
- App shell entry: `src/App.tsx` (default export), bootstrap in `src/main.tsx`
- Global styles: `src/index.css`

**Functions:**
- Event handlers in `App.tsx`: `handle` prefix + PascalCase action (e.g., `handleSelectItem`, `handleClaimItem`, `handleResetAllData`)
- Local handlers in components: same `handle` prefix (e.g., `handleClaim`, `handleSend`, `handleAddZoneSubmit`)
- Filter/map callbacks: short names (`i`, `z`, `cat`, `item`) acceptable in one-liners; prefer descriptive names in multi-step logic

**Variables:**
- React state: `[value, setValue]` with camelCase names (e.g., `currentTab`, `selectedItem`, `searchQuery`)
- Boolean UI flags: `is`/`show` prefix (e.g., `isClaiming`, `showSearchInput`, `showAddZoneModal`)
- Constants for static lists: camelCase arrays (e.g., `categories`, `navItems`, `quickReplies`)
- localStorage keys: `shoumanwu_` prefix + snake-ish suffix (e.g., `shoumanwu_items`, `shoumanwu_settings`)

**Types:**
- Domain interfaces: PascalCase nouns in `src/types.ts` (e.g., `Item`, `Zone`, `Owner`, `ChatMessage`, `AppSettings`)
- String union types for enums: PascalCase type name, literal values as written in UI/data (e.g., `NavTab`, `Category`, `ItemCondition`)
- Status enums in data: SCREAMING_SNAKE for zone status (`'ACTIVE' | 'PAUSED'`)
- Props interfaces: `{ComponentName}Props` co-located above the component (e.g., `ListViewProps` in `src/components/ListView.tsx`)

## Code Style

**Formatting:**
- No Prettier, ESLint, or Biome config detected
- TypeScript compiler is the only enforced style gate via `npm run lint` → `tsc --noEmit`
- Observed patterns: 2-space indentation, single quotes in TS/TSX strings, semicolons present
- Minor inconsistency: `src/main.tsx` uses compact import braces (`{StrictMode}`) while other files space inside braces (`{ useState }`); match the file you edit

**Linting:**
- Tool: TypeScript 5.8 (`typescript` in `package.json`)
- Config: `tsconfig.json` — `strict` mode not explicitly enabled; `skipLibCheck: true`, `noEmit: true`, `jsx: "react-jsx"`
- Run before commit: `npm run lint`

## Import Organization

**Order:**
1. React imports (`import React, { useState } from 'react'` or `import { StrictMode } from 'react'`)
2. Local type imports from `src/types.ts` (relative: `'./types'` or `'../types'`)
3. Local data/component imports (relative paths)
4. CSS imports last in entry files only (`src/main.tsx` imports `./index.css`)

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json` and `vite.config.ts`)
- Current codebase uses relative imports exclusively; either relative or `@/src/...` is acceptable — do not mix styles within a single file

**Extensions:**
- `allowImportingTsExtensions: true` — entry import uses explicit extension: `import App from './App.tsx'` in `src/main.tsx`
- Component-to-component imports omit extensions (e.g., `'./components/Header'`)

## Component Patterns

**Export style:**
- Views: named export with explicit typing — `export const ListView: React.FC<ListViewProps> = (...) => { ... }`
- App root: default export — `export default function App()` in `src/App.tsx`
- Data/constants: named exports — `export const INITIAL_ITEMS` in `src/data/initialItems.ts`
- Types: named exports from `src/types.ts`

**Props:**
- Define a dedicated `interface {Name}Props` immediately above the component
- Pass data down, callbacks up — no context, no external state library
- Optional props marked with `?` (e.g., `onBack?: () => void` in `src/components/Header.tsx`)

**State placement:**
- Global app state lives in `src/App.tsx` (items, zones, settings, messages, navigation)
- View-local UI state stays in the component (e.g., `claimingId` in `src/components/ListView.tsx`, drawer expand in `src/components/MapView.tsx`)

**Styling:**
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (`vite.config.ts`)
- Design tokens defined in `src/index.css` under `@theme { ... }` — prefer these CSS variables when adding theme-aware styles
- Most components use inline Notion-style hex classes (e.g., `text-[#37352f]`, `bg-[#df6b05]`, `border-[#ececec]`) — match existing palette when editing UI
- Icons: Google Material Symbols Outlined (`<span className="material-symbols-outlined">icon_name</span>`), loaded in `index.html`
- Utility classes from `src/index.css`: `.notion-input`, `.no-scrollbar`, `.custom-dashed`, `.notion-border`

## Error Handling

**Patterns:**
- localStorage hydration: wrap `JSON.parse` in try/catch, log with `console.error(e)`, fall back to defaults (`src/App.tsx` lines 22–83)
- Form validation: early return with `alert()` for user-visible errors (e.g., missing title in `src/components/PostItemView.tsx`)
- Destructive actions: `confirm()` before proceeding (e.g., reset data in `src/components/SettingsView.tsx`)
- Browser API failures: silent catch on share (`.catch(() => {})` in `src/components/Header.tsx`)
- No error boundaries, no toast library, no structured error types

**When adding new code:**
- Follow the localStorage try/catch + fallback pattern for client persistence
- Use `alert`/`confirm` for now to stay consistent with the AI Studio draft; migrate to a toast/modal pattern only when introduced project-wide

## Logging

**Framework:** `console` only

**Patterns:**
- `console.error(e)` on localStorage parse failures in `src/App.tsx`
- No `console.log` in production paths
- Do not add verbose logging without a structured logger — the app has no log aggregation

## Comments

**When to Comment:**
- Section dividers in JSX via `{/* ... */}` block comments (e.g., `{/* Main View Switcher */}` in `src/App.tsx`)
- Brief inline comments for non-obvious behavior (e.g., simulated owner reply in `src/App.tsx`, persist hooks)
- Type-level comments in `src/types.ts` for field semantics (e.g., `badge` examples)

**JSDoc/TSDoc:**
- Not used — props are self-documenting via `{Component}Props` interfaces
- Do not add JSDoc unless documenting a shared utility that lacks TypeScript types

## Function Design

**Size:**
- Components are large and self-contained (200–350 lines) — acceptable in this draft; extract subcomponents only when reuse is clear

**Parameters:**
- Callback props: verb phrases (`onSelectItem`, `onClaimItem`, `onPostSuccess`)
- Handlers receive minimal args (IDs or domain objects, not raw DOM events passed upward)

**Return Values:**
- Components return JSX directly; no render-prop or HOC patterns
- Filter functions inline in components return boolean (e.g., `filteredItems` in `src/components/ListView.tsx`)

**Simulated async:**
- Use `setTimeout` with ~600ms delay for claim/post actions; ~1200ms for chat auto-reply (`src/App.tsx`, `src/components/ListView.tsx`, `src/components/PostItemView.tsx`)
- Toggle loading flags (`isClaiming`, `isPosting`) around the timeout

## Module Design

**Exports:**
- One primary component per file in `src/components/`
- No barrel `index.ts` files — import components by direct path

**Barrel Files:**
- Not used — add new components as standalone files under `src/components/`

**Data layer:**
- Mock/seed data only: `src/data/initialItems.ts` exports `INITIAL_ITEMS` and `INITIAL_ZONES`
- Domain types centralized in `src/types.ts` — extend types here before adding fields to mock data or components

## Internationalization

**Current approach:**
- Settings store `language: 'zh' | 'en' | 'it'` in `AppSettings` (`src/types.ts`)
- Only `src/components/BottomNav.tsx` reads `settings.language` for tab labels
- All other UI strings are hardcoded English (with Chinese branding in header)

**When adding strings:**
- Extend the `labels` object pattern in `BottomNav.tsx` or introduce a shared `src/i18n/` module if i18n scope grows

## Dependencies

**Used in `src/`:**
- `react`, `react-dom` — UI
- Tailwind via `@import "tailwindcss"` in `src/index.css`

**Declared but unused in `src/`:**
- `@google/genai`, `express`, `dotenv`, `lucide-react`, `motion` — present in `package.json` from AI Studio scaffold; do not import until backend/AI features land

---

*Convention analysis: 2026-07-27*
