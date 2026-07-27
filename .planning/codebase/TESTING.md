# Testing Patterns

**Analysis Date:** 2026-07-27

## Test Framework

**Runner:**
- Not detected in the frontend PWA (`package.json` has no test runner)
- No `vitest.config.*`, `jest.config.*`, or Playwright config at project root

**Assertion Library:**
- Not applicable — no tests exist

**Type checking (only quality gate today):**
- TypeScript 5.8 via `npm run lint` → `tsc --noEmit`
- Config: `tsconfig.json`

**Run Commands:**
```bash
npm run lint              # Type-check only (current CI-equivalent gate)
npm run dev               # Manual smoke test at http://localhost:3000
npm run build             # Production build verification
npm run preview           # Preview production build
```

## Test File Organization

**Location:**
- No test files in the repository (`*.test.*` / `*.spec.*` count: 0)
- Frontend: no established pattern yet
- Planned backend (`scraper/`): co-located `*.test.ts` beside source (documented in `.planning/phases/01-scraper-foundation-listing-data-model/01-PATTERNS.md`, not yet implemented)

**Naming:**
- When adding frontend tests: co-locate as `{ComponentName}.test.tsx` next to the component, or `{module}.test.ts` next to utilities
- Scraper convention (future): `src/shared/schema.test.ts` alongside `src/shared/schema.ts`

**Structure:**
```
src/
├── components/
│   ├── ListView.tsx
│   └── ListView.test.tsx          # recommended when tests are added
├── data/
│   ├── initialItems.ts
│   └── initialItems.test.ts       # recommended for filter/seed helpers
├── App.tsx
└── types.ts
```

## Test Structure

**Suite Organization:**
- No existing examples in this repo
- Recommended pattern for new frontend unit tests (Vitest + React Testing Library):

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListView } from './ListView';
import { INITIAL_ITEMS } from '../data/initialItems';

describe('ListView', () => {
  const defaultProps = {
    items: INITIAL_ITEMS,
    onSelectItem: vi.fn(),
    onClaimItem: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
    selectedCategory: 'All' as const,
    onCategoryChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters items by search query', () => {
    render(<ListView {...defaultProps} searchQuery="keyboard" />);
    expect(screen.getByText(/Mechanical Keyboard/)).toBeInTheDocument();
  });
});
```

**Patterns:**
- Setup: `beforeEach` to reset mocks and localStorage
- Teardown: `vi.restoreAllMocks()` if spying on globals
- Assertions: Testing Library queries (`getByRole`, `getByText`) over implementation details

## Mocking

**Framework:**
- Not configured — recommend Vitest built-in `vi` when tests are added

**Patterns:**
```typescript
// localStorage (used heavily in src/App.tsx)
const store: Record<string, string> = {};
beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  });
});

// Timers for claim/post/chat delays (600ms / 1200ms setTimeout)
vi.useFakeTimers();
// ... trigger action ...
vi.advanceTimersByTime(600);
```

**What to Mock:**
- `localStorage` — all persistence keys (`shoumanwu_items`, `shoumanwu_zones`, `shoumanwu_settings`, `shoumanwu_messages`)
- `setTimeout` — claim, post, and chat auto-reply flows
- `window.scrollTo`, `navigator.share`, `navigator.clipboard`, `alert`, `confirm` — used in `src/App.tsx`, `src/components/Header.tsx`, `src/components/SettingsView.tsx`
- External image URLs — network not needed for unit tests; stub `img` or pass fixture data from `src/data/initialItems.ts`

**What NOT to Mock:**
- Pure filter logic inlined in components (extract to testable helpers first if mocking becomes heavy)
- React state updates — use Testing Library `fireEvent` / `userEvent` instead of mocking `useState`

## Fixtures and Factories

**Test Data:**
- Reuse production seed data: `INITIAL_ITEMS`, `INITIAL_ZONES` from `src/data/initialItems.ts`
- For isolated tests, pick a single fixture item by id (e.g., `item-1`) rather than duplicating full `Item` objects

**Location:**
- Shared fixtures: add `src/test/fixtures.ts` when test count grows
- Until then, import directly from `src/data/initialItems.ts`

**Factory pattern (recommended when backend lands):**
```typescript
import type { Item } from '../types';

export function buildItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-test-1',
    title: 'Test Item',
    description: 'Test description',
    category: 'Furniture',
    condition: 'Good',
    location: "Jing'an District, Shanghai",
    district: "Jing'an District",
    city: 'Shanghai',
    imageUrl: 'https://example.com/image.jpg',
    timeAgo: '1h ago',
    isAvailable: true,
    cost: 'Free',
    owner: {
      id: 'owner-test',
      name: 'Test Owner',
      avatar: 'https://example.com/avatar.jpg',
      joinedYear: 2024,
      itemsGiven: 1,
      isVerified: true,
    },
    lat: 31.23,
    lng: 121.45,
    createdAt: Date.now(),
    ...overrides,
  };
}
```

## Coverage

**Requirements:** None enforced (no coverage config, no CI test step for frontend)

**View Coverage:**
- Not applicable until a test runner is installed

**Recommended first targets (highest value, lowest mock cost):**
1. Category/search filtering logic — currently inline in `src/components/ListView.tsx` and `src/components/MapView.tsx`
2. `handleClaimItem` / state persistence behavior in `src/App.tsx`
3. Form validation in `src/components/PostItemView.tsx` (title required)
4. Zone CRUD handlers in `src/App.tsx` (`handleAddZone`, `handleToggleZoneStatus`, `handleDeleteZone`)

## Test Types

**Unit Tests:**
- Not present
- Scope when added: pure functions, filter logic, localStorage hydration helpers, type-narrowing utilities
- Runner recommendation: Vitest 3.x (aligns with planned `scraper/` stack in `.planning/research/STACK.md`)

**Integration Tests:**
- Not present
- Scope when added: render `App` with mocked localStorage; tab navigation; claim flow end-to-end within React tree
- Tools: `@testing-library/react`, `@testing-library/user-event`, `jsdom` environment

**E2E Tests:**
- Not used
- Manual smoke path: `npm run dev` → exercise list, map, post, settings, detail, chat flows
- Future option: Playwright (already planned for scraper spike in Phase 01 plans) — separate from frontend unit tests

## Common Patterns

**Async Testing:**
```typescript
import { waitFor } from '@testing-library/react';

it('shows claiming state then marks item claimed', async () => {
  vi.useFakeTimers();
  const onClaimItem = vi.fn();
  render(<ListView {...props} onClaimItem={onClaimItem} />);
  fireEvent.click(screen.getByRole('button', { name: /claim item/i }));
  expect(screen.getByText('Claiming...')).toBeInTheDocument();
  vi.advanceTimersByTime(600);
  await waitFor(() => expect(onClaimItem).toHaveBeenCalledWith('item-1'));
  vi.useRealTimers();
});
```

**Error Testing:**
```typescript
it('falls back to INITIAL_ITEMS when localStorage JSON is invalid', () => {
  localStorage.setItem('shoumanwu_items', '{ invalid');
  // render App with error spy
  expect(console.error).toHaveBeenCalled();
  expect(screen.getByText(/Vintage Lounge Chair/)).toBeInTheDocument();
});
```

## Adding a Test Stack (Not Yet Done)

When introducing frontend tests, add to root `package.json`:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Create `vitest.config.ts` at project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

Add scripts:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

## Cross-Package Testing (Future)

The scraper subsystem (Phase 01, not in repo yet) is planned to use:
- Runner: Vitest 3.x
- Layout: co-located `*.test.ts` under `scraper/src/`
- Command: `cd scraper && npx vitest run --reporter=dot`
- Keep frontend (`src/`) and scraper tests separate — different `package.json`, no cross-imports

---

*Testing analysis: 2026-07-27*
