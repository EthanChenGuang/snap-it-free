# Phase 6: Scraper Admin Console - Pattern Map

**Mapped:** 2026-08-04
**Files analyzed:** 42 new/modified files
**Analogs found:** 38 / 42

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/017_scraper_admin.sql` | migration | batch | `supabase/migrations/016_auth_alerts_push.sql` | exact |
| `middleware.ts` | middleware | request-response | `app/auth/callback/route.ts` + `app/post/manage/page.tsx` | partial |
| `lib/admin/require-operator.ts` | middleware | request-response | `lib/supabase/auth.ts` | role-match |
| `lib/admin/schemas.ts` | utility | transform | `lib/alerts/schemas.ts` | exact |
| `lib/admin/crypto.ts` | utility | transform | `app/api/ugc/listings/route.ts` (crypto hash) | partial |
| `lib/admin/presets.ts` | utility | transform | `scraper/src/subito/crawler.ts` | exact |
| `lib/admin/translate.ts` | service | request-response | `scraper-admin/server.ts` | role-match |
| `lib/admin/url-validate.ts` | utility | transform | `scraper/src/subito/categories.ts` | partial |
| `lib/admin/*.test.ts` | test | — | `lib/alerts/schemas.test.ts` | exact |
| `app/admin/layout.tsx` | provider | — | `app/layout.tsx` + `components/shell/AppChrome.tsx` | partial |
| `app/admin/page.tsx` | component | CRUD | `app/settings/page.tsx` + `scraper-admin/DashboardView.tsx` | partial |
| `app/admin/sources/page.tsx` | component | CRUD | `scraper-admin/SourcesView.tsx` | role-match |
| `app/admin/sources/[slug]/page.tsx` | component | CRUD | `scraper-admin/SubitoConfigView.tsx` | exact |
| `app/admin/runs/page.tsx` | component | CRUD | `scraper-admin/RunHistoryView.tsx` | role-match |
| `app/admin/runs/[id]/page.tsx` | component | CRUD | `scraper-admin/RunDetailView.tsx` | role-match |
| `app/admin/rejects/page.tsx` | component | CRUD | `scraper-admin/RejectsView.tsx` | role-match |
| `app/admin/translation/page.tsx` | component | CRUD | `scraper-admin/TranslationQueueView.tsx` | role-match |
| `app/admin/settings/page.tsx` | component | CRUD | `scraper-admin/SettingsView.tsx` | role-match |
| `components/admin/AdminShell.tsx` | component | — | `scraper-admin/Sidebar.tsx` + `Header.tsx` | exact |
| `components/admin/*Client.tsx` | component | CRUD | `components/settings/AlertsSection.tsx` | exact |
| `app/api/admin/sources/route.ts` | route | CRUD | `app/api/alerts/route.ts` | exact |
| `app/api/admin/sources/[slug]/route.ts` | route | CRUD | `app/api/alerts/[id]/route.ts` | exact |
| `app/api/admin/config/route.ts` | route | CRUD | `app/api/alerts/[id]/route.ts` | role-match |
| `app/api/admin/jobs/route.ts` | route | event-driven | `app/api/alerts/route.ts` (POST insert) | role-match |
| `app/api/admin/operators/route.ts` | route | CRUD | `app/api/alerts/[id]/route.ts` (DELETE guards) | role-match |
| `app/api/admin/translation/retry/route.ts` | route | batch | `app/api/cron/match-alerts/route.ts` | role-match |
| `scraper/src/config-loader.ts` | service | CRUD | `scraper/src/config.ts` | exact |
| `scraper/src/scheduler.ts` | service | event-driven | `scraper/src/worker.ts` (main tick) | exact |
| `scraper/src/worker.ts` | service | event-driven | `scraper/src/worker.ts` (existing) | exact |
| `scraper/src/translate/ingest.ts` | service | transform | `scraper/src/shared/persist.ts` | role-match |
| `scraper/src/subito/crawler.ts` | service | file-I/O | `scraper/src/subito/crawler.ts` (existing) | exact |
| `scraper/src/alert/notify.ts` | service | request-response | `scraper/src/alert/notify.ts` (existing) | exact |
| `scraper/src/shared/persist.ts` | service | CRUD | `scraper/src/shared/persist.ts` (existing) | exact |
| `components/shell/AppChrome.tsx` | component | — | `components/shell/AppChrome.tsx` (modify) | exact |

---

## Pattern Assignments

### `supabase/migrations/017_scraper_admin.sql` (migration, batch)

**Analog:** `supabase/migrations/016_auth_alerts_push.sql`

**Table + RLS pattern** (lines 26–56):

```sql
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text,
  zone venice_zone,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (keyword is not null or zone is not null)
);

alter table public.alerts enable row level security;

create policy "alerts_select_own"
  on public.alerts for select to authenticated
  using (user_id = auth.uid());
```

**Audit table baseline** — extend, do not recreate (`supabase/migrations/003_scrape_audit_tables.sql` lines 1–22):

```sql
create table public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('success', 'failed', 'partial')),
  listings_found int not null default 0,
  ...
);
```

**Phase 6 additions:** `is_operator()` security definer + policies on `scraper_sources`, `scraper_global_config`, `operator_allowlist`, `scrape_jobs`, `translation_queue`; `alter table scrape_runs add column source`; listing translation columns; seed D-52 URLs from `scraper/src/subito/categories.ts`.

---

### `middleware.ts` (middleware, request-response)

**Analog:** No existing file — combine Supabase SSR cookie refresh pattern with server redirect from `app/post/manage/page.tsx`.

**Session check + redirect** (`app/post/manage/page.tsx` lines 7–16):

```typescript
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  redirect('/post');
}
```

**Post-auth redirect target** (`app/auth/callback/route.ts` lines 5–14):

```typescript
const next = safeNextPath(searchParams.get('next'));
// ...
return NextResponse.redirect(`${origin}${next}`);
```

**Apply to `/admin`:** Use `@supabase/ssr` `createServerClient` in middleware with cookie getAll/setAll; unauthenticated → redirect `/post?next=/admin`; authenticated non-operator → redirect `/` (D-48/D-49). Reuse `safeNextPath` from `lib/auth/safe-next-path.ts`.

---

### `lib/admin/require-operator.ts` (middleware, request-response)

**Analog:** `lib/supabase/auth.ts`

**Auth helper pattern** (lines 1–10):

```typescript
import type { User } from '@supabase/supabase-js';
import { createClient } from './server';

export async function requireAuth(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
```

**Extend for operators:** After `requireAuth()`, query `operator_allowlist` where `lower(email) = lower(user.email)`. Return `{ user, isOperator }` or throw/return null for Route Handlers. Mirror RLS `is_operator()` SQL from RESEARCH.md Pattern 1.

---

### `lib/admin/schemas.ts` (utility, transform)

**Analog:** `lib/alerts/schemas.ts`

**Zod enum + bounds pattern** (lines 4–8, 37–47):

```typescript
export const veniceZoneSchema = z.enum([
  'centro_storico',
  'mestre_marghera',
  'lido_murano',
] satisfies [VeniceZone, VeniceZone, VeniceZone]);

export const UpdateAlertSchema = z.object({
  enabled: z.boolean().optional(),
  keyword: z.string().trim().max(100).nullable().optional()
    .transform((value) => (value === '' ? null : value)),
  zone: veniceZoneSchema.nullable().optional(),
});
```

**Phase 6 schemas to add:**

```typescript
export const UpdateSourceSchema = z.object({
  enabled: z.boolean().optional(),
  interval_minutes: z.number().int().min(30).max(1440).optional(),
  target_urls: z.array(z.string().url()).min(1).optional(),
  anti_block_preset: z.enum(['conservative', 'standard', 'aggressive']).optional(),
});
```

Export inferred types; co-locate row types like `AlertRow`.

---

### `lib/admin/crypto.ts` (utility, transform)

**Analog:** Partial — Node crypto usage in `app/api/ugc/listings/route.ts`

**Hash pattern** (lines 1–14):

```typescript
import { createHash, randomUUID } from 'node:crypto';

function contentHash(title: string, photoUrl: string, lat: number, lng: number): string {
  const payload = `${title}|${photoUrl}|${lat}|${lng}`;
  return createHash('sha256').update(payload).digest('hex');
}
```

**Phase 6:** Use `createCipheriv` / `createDecipheriv` with AES-256-GCM; store `{ iv, tag, data }` as base64 in `scraper_global_config.proxy_enc`; key from `SCRAPER_SECRETS_KEY` env (32-byte). Worker decrypts at run start; fallback to `getProxyUrl()` from `scraper/src/config.ts`.

---

### `lib/admin/presets.ts` (utility, transform)

**Analog:** `scraper/src/subito/crawler.ts`

**Current Crawlee defaults = Standard preset** (lines 15–25):

```typescript
const proxyUrl = getProxyUrl();
const proxyConfiguration = proxyUrl
  ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
  : undefined;

const crawler = new PlaywrightCrawler({
  proxyConfiguration,
  useSessionPool: true,
  persistCookiesPerSession: true,
  sessionPoolOptions: { maxPoolSize: 5 },
  maxRequestRetries: 3,
  ...
});
```

**Map presets per RESEARCH.md:** Conservative (2/2/1), Standard (5/3/1), Aggressive (8/5/2). Export `presetToCrawlerOptions(preset)` consumed by refactored `runSubitoCrawler(urls, preset)`.

---

### `lib/admin/translate.ts` (service, request-response)

**Analog:** `scraper-admin/server.ts`

**Gemini primary call** (lines 42–50):

```typescript
const response = await ai.models.generateContent({
  model: "gemini-3.6-flash",
  contents: `Translate the following web scraper listing payload content into ${targetLanguage}...`,
  config: {
    systemInstruction: "You are a specialized translator for international real estate and marketplace scraped listings.",
    temperature: 0.3,
  },
});
```

**Extend for production:** Use `@google/genai` from root `package.json`; translate to en **and** zh in one or two calls; OpenRouter fallback via `fetch('https://openrouter.ai/api/v1/chat/completions', ...)`; respect daily cap from `scraper_global_config`; on failure return `{ ok: false, error }` without throwing (D-27).

---

### `lib/admin/url-validate.ts` (utility, transform)

**Analog:** `scraper/src/subito/categories.ts` + Subito URL shape

**Venice-scoped URL constants** (lines 1–7):

```typescript
export const SUBITO_CATEGORY_URLS = [
  'https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/',
  'https://www.subito.it/annunci-veneto/regalo/elettrodomestici/venezia/venezia/',
  'https://www.subito.it/annunci-veneto/regalo/bambini-giocattoli/venezia/venezia/',
] as const;
```

**Validate per source:** Host allowlist (subito.it, facebook.com, vinted.it, wallapop.com, ebay.it); Venice geo params per D-52 templates; reject URLs outside patterns before Zod passes to DB.

---

### `app/admin/layout.tsx` (provider, —)

**Analog:** `app/layout.tsx` + bypass `AppChrome`

**Root layout wraps all routes** (`app/layout.tsx` lines 42–44):

```typescript
<AppChrome>
  {children}
</AppChrome>
```

**AppChrome pathname guard** (`components/shell/AppChrome.tsx` lines 8–17):

```typescript
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isListingDetail = pathname.startsWith('/listing/');
  // ...
}
```

**Phase 6:** Add `isAdmin = pathname.startsWith('/admin')` → render `{children}` only (no Header/BottomNav). Admin layout provides `AdminShell` (sidebar + top bar) per Stitch `admin_dashboard/code.html`. Load Material Symbols (already in root head). Chinese-primary copy per D-34.

---

### `app/admin/page.tsx` + sibling pages (component, CRUD)

**Analog:** `app/settings/page.tsx` (SSR shell) + `scraper-admin/*View.tsx` (interaction layout)

**Server page + client split** (`app/settings/page.tsx` lines 1–22):

```typescript
import { Suspense } from 'react';
import { SettingsPageClient } from '@/components/settings/SettingsPageClient';

export default function SettingsPage() {
  const messages = getMessages('zh');
  return (
    <Suspense fallback={...}>
      <SettingsPageClient />
    </Suspense>
  );
}
```

**Protected server page** (`app/post/manage/page.tsx` lines 7–18):

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  redirect('/post');
}
const listings = await getOwnerListings();
```

**Dashboard interaction props** (`scraper-admin/src/components/DashboardView.tsx` lines 19–29):

```typescript
interface DashboardViewProps {
  sources: Source[];
  alerts: AlertItem[];
  systemConfig: SystemConfig;
  onNavigate: (tab: NavTab, sourceId?: string) => void;
  onToggleSource: (sourceId: string) => void;
  onRunNow: (sourceId: string) => void;
  ...
}
```

**Port strategy:** Server component fetches from Supabase (`lib/listings/queries.ts` pattern); pass initial data to `*Client.tsx`; replace mock `onNavigate` with Next.js `Link`/`useRouter`; restyle to `scraper-dashboard/DESIGN.md` tokens (not reference Notion hex).

---

### `app/admin/sources/[slug]/page.tsx` (component, CRUD)

**Analog:** `scraper-admin/src/components/SubitoConfigView.tsx`

**Interval bounds + save handler** (lines 34–57):

```typescript
const handleDecreaseInterval = () => {
  setInterval((prev) => Math.max(30, prev - 15));
};
const handleIncreaseInterval = () => {
  setInterval((prev) => Math.min(1440, prev + 15));
};
const handleSave = () => {
  const urlsArray = targetUrlsText
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean);
  const updated: Source = { ...source, enabled, interval, targetUrls: urlsArray, antiBlock };
  onSave(updated);
};
```

**Wire to:** `PATCH /api/admin/sources/[slug]` with `UpdateSourceSchema`; display read-only validation thresholds from worker constants (D-23).

---

### `components/admin/AdminShell.tsx` (component, —)

**Analog:** `scraper-admin/src/components/Sidebar.tsx` + `App.tsx` tab router

**Nav items structure** (`Sidebar.tsx` lines 33–74):

```typescript
const navItems = [
  { id: 'dashboard' as NavTab, label: 'Dashboard Overview', icon: '📊', ... },
  { id: 'sources' as NavTab, label: 'Integration Sources', icon: '🌐', ... },
  { id: 'runs' as NavTab, label: 'Execution History', icon: '📜', ... },
  { id: 'rejects' as NavTab, label: 'Scrape Rejects', badge: rejectsCount, ... },
  { id: 'translation' as NavTab, label: 'Translation Queue', badge: pendingTranslationsCount, ... },
  { id: 'settings' as NavTab, label: 'System Parameters', icon: '⚙️', ... },
];
```

**Replace:** lucide icons → Material Symbols Outlined; tab state → Next.js `usePathname()` + `Link href="/admin/runs"`; badges from server-fetched counts.

---

### `components/admin/*Client.tsx` (component, CRUD)

**Analog:** `components/settings/AlertsSection.tsx`

**Auth-gated fetch + PATCH** (lines 72, 110–128):

```typescript
const response = await fetch('/api/alerts');
// ...
const response = await fetch(`/api/alerts/${alert.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ enabled: next }),
});
// ...
const response = await fetch(`/api/alerts/${alert.id}`, { method: 'DELETE' });
```

**Apply to admin:** Same fetch-to-Route-Handler pattern for `/api/admin/sources`, `/api/admin/jobs` (Run now POST), `/api/admin/config`. Use `useAuthSession()` only if needed for operator email display; middleware handles gate.

---

### `app/api/admin/sources/route.ts` (route, CRUD)

**Analog:** `app/api/alerts/route.ts`

**GET list pattern** (lines 10–28):

```typescript
export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alerts')
    .select('id, keyword, zone, enabled, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ alerts: (data ?? []) as AlertRow[] });
}
```

**Phase 6:** Replace `requireAuth` with `requireOperator()`; select from `scraper_sources`; RLS allows operators via `is_operator()`.

---

### `app/api/admin/sources/[slug]/route.ts` (route, CRUD)

**Analog:** `app/api/alerts/[id]/route.ts`

**PATCH with validation + merge** (lines 16–97):

```typescript
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = UpdateAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // fetch existing, merge fields, update...
}
```

**Phase 6:** Use `UpdateSourceSchema`; validate URLs via `url-validate.ts`; encrypt proxy only in `/api/admin/config`, not here.

---

### `app/api/admin/config/route.ts` (route, CRUD)

**Analog:** `app/api/alerts/[id]/route.ts` (single-resource update)

**Use `createServiceClient()`** when RLS insufficient for encrypted proxy write; otherwise operator RLS on `scraper_global_config` singleton row `id = 1`. PATCH body: `global_pause`, `auto_translate`, `daily_translation_cap`, `telegram_chat_id`, `alert_email`, `proxy_url` (encrypt before store).

---

### `app/api/admin/jobs/route.ts` (route, event-driven)

**Analog:** `app/api/alerts/route.ts` POST insert

**POST insert pattern** (lines 30–81):

```typescript
export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parsed = CreateAlertSchema.safeParse(body);
  // ...
  const { data, error } = await supabase
    .from('alerts')
    .insert({ user_id: user.id, keyword, zone, enabled: true })
    .select('id, keyword, zone, enabled, created_at')
    .single();
  return NextResponse.json({ alert: data as AlertRow }, { status: 201 });
}
```

**Phase 6:** Insert into `scrape_jobs` with `source_slug`, `status: 'pending'`, `requested_by: user.id`. Worker polls every 60s (D-33).

---

### `app/api/admin/operators/route.ts` (route, CRUD)

**Analog:** `app/api/alerts/[id]/route.ts` DELETE with guards

**DELETE with ownership check** (lines 100–125):

```typescript
export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  const { data, error } = await supabase.from('alerts').delete()...
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
```

**Add guards:** Cannot delete self (D-46); cannot delete last operator (D-47); POST add by email without pre-existing user (D-45).

---

### `app/api/admin/translation/retry/route.ts` (route, batch)

**Analog:** `app/api/cron/match-alerts/route.ts`

**Service role batch processing** (lines 22–35):

```typescript
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const supabase = createServiceClient();
    const processed = await processPendingListingEvents(supabase);
    return NextResponse.json({ processed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Phase 6:** POST (operator auth, not cron secret); dequeue `translation_queue` pending rows; call `lib/admin/translate.ts`; update listing `*_en`/`*_zh` columns.

---

### `scraper/src/config-loader.ts` (service, CRUD)

**Analog:** `scraper/src/config.ts`

**Service role client** (lines 12–16):

```typescript
export const supabaseAdmin: SupabaseClient = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
```

**Env fallback for proxy** (lines 27–35):

```typescript
export function getProxyUrl(): string | undefined {
  const url = process.env.PROXY_URL?.trim();
  if (!url) return undefined;
  if (!/^https?:\/\//.test(url)) {
    throw new Error('PROXY_URL must be an http(s) URL');
  }
  return url;
}
```

**Load at run start:** Fetch `scraper_global_config` + enabled `scraper_sources`; decrypt proxy or fall back to `getProxyUrl()`; fall back to `SUBITO_CATEGORY_URLS` if DB empty (bootstrap).

---

### `scraper/src/scheduler.ts` (service, event-driven)

**Analog:** `scraper/src/worker.ts`

**Current cron tick + overlap guard** (lines 212–235):

```typescript
let scrapeInProgress = false;

async function main(): Promise<void> {
  if (CRON_ENABLED) {
    const intervalMs = 90 * 60 * 1000;
    const tick = async () => {
      if (scrapeInProgress) {
        console.log('Previous scrape still in progress — skipping this tick');
        return;
      }
      scrapeInProgress = true;
      try {
        await runScrape();
      } finally {
        scrapeInProgress = false;
      }
    };
    await tick();
    setInterval(tick, intervalMs);
  }
}
```

**Replace with:** 60s tick; query due sources (`next_run_at <= now()`) + pending `scrape_jobs`; respect `global_pause`; stagger with `setTimeout(i * STAGGER_MINUTES * 60_000)`; update `next_run_at` after each run.

---

### `scraper/src/worker.ts` (service, event-driven — refactor)

**Analog:** `scraper/src/worker.ts` (existing)

**Run orchestration** (lines 49–87, 109–209):

```typescript
export async function startScrapeRun(supabase: SupabaseClient): Promise<ScrapeRunRecord> {
  const { data, error } = await supabase
    .from('scrape_runs')
    .insert({ started_at: startedAt.toISOString(), status: 'partial' })
    .select('id')
    .single();
  ...
}

export async function runScrape(supabase: SupabaseClient = supabaseAdmin): Promise<void> {
  const run = await startScrapeRun(supabase);
  const { rawListings, selectorHitRate } = await runSubitoCrawler([...SUBITO_CATEGORY_URLS]);
  const validation = validateBatch(...);
  if (!validation.ok) {
    await finishScrapeRun(supabase, run.id, { status: 'failed', ... });
    await notifyOperator({ ... });
    return;
  }
  const stats = await persistBatch(supabase, rawListings, run.id);
  await finishScrapeRun(supabase, run.id, { status: 'success', ... });
}
```

**Refactor:** Parameterize by `source_slug`; pass URLs/preset from config-loader; add `source` to scrape_runs insert; coming-soon sources no-op with message (D-05); call translation after persist.

---

### `scraper/src/translate/ingest.ts` (service, transform)

**Analog:** `scraper/src/shared/persist.ts`

**Post-persist hook point** (`persist.ts` lines 53–76):

```typescript
const row = {
  source: listing.source,
  external_id: listing.external_id,
  title: listing.title,
  ...
  raw_payload: listing.raw_payload ?? null,
};
const { error: upsertError } = await supabase
  .from('listings')
  .upsert(row, { onConflict: 'source,external_id' });
```

**After upsert:** If `auto_translate` and under cap, call translate → set `title_en`, `title_zh`, etc.; on failure insert `translation_queue` row without rolling back listing.

---

### `scraper/src/subito/crawler.ts` (service, file-I/O — modify)

**Analog:** Self — add preset parameter

Accept optional `AntiBlockPreset` from `lib/admin/presets.ts` (or scraper-local copy to avoid cross-package import); pass to `sessionPoolOptions.maxPoolSize`, `maxRequestRetries`.

---

### `scraper/src/alert/notify.ts` (service, request-response — modify)

**Analog:** Self — extend channel resolution

**Env-based channel pick** (lines 71–78):

```typescript
function resolveChannel(): 'telegram' | 'resend' | null {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    return 'telegram';
  }
  if (process.env.RESEND_API_KEY && process.env.ALERT_FROM && process.env.ALERT_TO) {
    return 'resend';
  }
  return null;
}
```

**Extend:** Read `telegram_chat_id` / `alert_email` from DB config at notify time; keep `TELEGRAM_BOT_TOKEN` / `RESEND_API_KEY` in env only (D-06).

---

### `lib/admin/*.test.ts` / `scraper/src/*.test.ts` (test)

**Analog:** `lib/alerts/schemas.test.ts`

**Vitest schema tests** (lines 1–38):

```typescript
import { describe, expect, it } from 'vitest';
import { CreateAlertSchema } from './schemas';

describe('CreateAlertSchema', () => {
  it('rejects empty keyword and zone', () => {
    const result = CreateAlertSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
```

**Scraper test style** (`scraper/src/shared/validate-run.test.ts` lines 1–26):

```typescript
describe('validateBatch', () => {
  it('fails when count is below 50% of trailing median', () => {
    const result = validateBatch(Array(40).fill({}), trailingMedians, 0.95);
    expect(result.ok).toBe(false);
  });
});
```

---

## Shared Patterns

### Authentication (Route Handlers)

**Source:** `lib/supabase/auth.ts` + `app/api/alerts/route.ts`  
**Apply to:** All `app/api/admin/**` routes

```typescript
const user = await requireAuth();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Extend with operator allowlist check before any mutation/read of admin tables.

---

### Supabase Server Client (RLS reads)

**Source:** `lib/supabase/server.ts`  
**Apply to:** Admin server components + Route Handlers (non-secret writes)

```typescript
export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
```

---

### Service Role Client (worker + encrypted writes)

**Source:** `lib/supabase/service.ts`  
**Apply to:** Worker config load, translation retry batch, proxy decrypt

```typescript
export function createServiceClient() {
  const { url } = requireSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

---

### Zod Validation + Error Responses

**Source:** `app/api/alerts/route.ts`  
**Apply to:** All admin POST/PATCH handlers

```typescript
let body: unknown;
try {
  body = await request.json();
} catch {
  return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
}
const parsed = CreateAlertSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
}
```

---

### Server Component Data Fetch

**Source:** `lib/listings/queries.ts`  
**Apply to:** Admin pages loading runs, sources, rejects

```typescript
export async function getActiveListings(): Promise<ListingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLIC_LISTINGS)
    .select(ACTIVE_LISTING_COLUMNS)
    .order('posted_at', { ascending: false });
  if (error) {
    return [];
  }
  return (data ?? []) as ListingRow[];
}
```

Create `lib/admin/queries.ts` with similar patterns for `scrape_runs`, `scraper_sources`, etc.

---

### Client → API Mutations

**Source:** `components/settings/AlertsSection.tsx`  
**Apply to:** All admin client components (toggle source, run now, save settings)

```typescript
const response = await fetch(`/api/alerts/${alert.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ enabled: next }),
});
```

---

### Auth Redirect Flow

**Source:** `components/ugc/AuthPromptModal.tsx` + `lib/auth/safe-next-path.ts`  
**Apply to:** Logged-out `/admin` visitors (D-48)

```typescript
function buildRedirectToUrl(redirectTo: string): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
}
```

Admin login page or modal should use `redirectTo="/admin"`.

---

### Domain Types Reference

**Source:** `scraper-admin/src/types.ts`  
**Apply to:** `lib/admin/schemas.ts` row types and component props (port names to DB column names)

```typescript
export interface Source {
  id: string;
  name: string;
  status: 'Running' | 'Completed' | 'Failed' | 'Coming soon' | 'Idle';
  enabled: boolean;
  interval: number;
  antiBlock: AntiBlockStrategy;
  targetUrls: string[];
  ...
}
```

Map `id` → `slug`, `interval` → `interval_minutes`, `antiBlock` → `anti_block_preset`.

---

### Stitch UI Authority

**Source:** `.planning/google-stitch-ui-design/scraper-dashboard/DESIGN.md`  
**Apply to:** All `app/admin/**` and `components/admin/**`

Read matching `scraper-dashboard/{screen}/code.html` before implementing each route. Port structure from `scraper-admin` views; restyle to Stitch tokens from `app/globals.css` @theme — not reference app's Notion hex (`#37352f`, `#e9e9e8`).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `middleware.ts` | middleware | request-response | No `middleware.ts` in repo; follow Supabase Next.js example + local redirect patterns |
| `lib/admin/crypto.ts` | utility | transform | No AES encryption module; only SHA-256 hash in UGC route — use Node `crypto` AES-256-GCM per RESEARCH.md |
| `lib/admin/require-operator.ts` | middleware | request-response | No allowlist helper yet — extend `requireAuth()` |
| `scraper/src/scheduler.ts` | service | event-driven | New module; closest is worker tick but per-source DB schedule is novel |

---

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `scraper/src/`, `scraper-admin/src/`, `supabase/migrations/`  
**Files scanned:** ~120  
**Pattern extraction date:** 2026-08-04

**Reference implementation note:** `scraper-admin/` provides interaction layout only (D-53). Do not copy lucide icons, English copy, or mock CRUD — wire to Supabase per patterns above.

**Key cross-cutting decisions from CONTEXT:**
- Route Handlers only (not Server Actions) — match `app/api/alerts/route.ts`
- Worker separation preserved — admin enqueues; worker executes
- Validation thresholds read-only in UI — values from `scraper/src/config.ts`
- Default Subito URLs from `scraper/src/subito/categories.ts`, not `scraper-admin/data/initialData.ts`
