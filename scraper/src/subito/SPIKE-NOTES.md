# Subito.it Live DOM Spike (D-23)

**Spiked:** 2026-07-28  
**Pages:** 3 Veneto regalo category URLs + detail pages  
**Tool:** Playwright headless Chromium (scripts in `scraper/scripts/spike-subito*.mjs`)

## Anti-bot signals

| Signal | Observation |
|--------|-------------|
| HTTP status | 200 on all 3 category pages — no hard block in headless run |
| Page title | Normal category titles; no "blocked" / captcha title |
| Cookie banner | Didomi-style notice on first visit; dismiss with `#didomi-notice-agree-button` or "Accetta" |
| Rate limiting | Not observed during spike (3 categories + 2 detail pages) |
| User-Agent | Standard Chrome UA accepted |

**Recommendation:** Retire Crawlee session when `page.title()` contains "blocked" (case-insensitive). Proxy rotation deferred to Plan 04.

## Category page structure

**Container:** `[data-testid="listing-container"]` wraps listing grid.

**Card selector (primary):** `article` inside listing container (~31–32 cards per page).

| Field | Selector candidate | Notes |
|-------|-------------------|-------|
| `external_url` | `article a[href*=".htm"]` | Full URL e.g. `https://www.subito.it/arredamento-casalinghi/accessori-camera-da-letto-venezia-655558887.htm` |
| `external_id` | Regex on href: `/-(\d+)\.htm$/` | e.g. `655558887` |
| `title` | `article h3` or `h3[class*="subject"]` | Card title text |
| `photo_url` | `article img[src*="sbito.it"]` | Many cards use category placeholder (`assets.subito.it/static/icons/categories/*.svg`) — **fetch real photo from detail page** |
| `posted_at` | Not reliable on card | Card `span.caption` shows municipality, not date — **parse from detail page** |
| `description` | N/A on card | **Detail page only** (D-17) |

## Detail page structure

Visited: `…/accessori-camera-da-letto-venezia-655558887.htm`

| Field | Selector candidate | Notes |
|-------|-------------------|-------|
| `title` | `h1` | Matches card title |
| `photo_url` | `img[src*="sbito.it/api"]` | First non-icon image; e.g. `images.sbito.it/api/v1/sbt-ads-images-pro/...` |
| `posted_at` | `span[class*="insertion-date"]` | Italian relative text e.g. `Oggi alle 09:03`, `Ieri alle 14:30` — parse to ISO |
| `description` | First substantial `p` after "Descrizione" heading, or `p` with length > 40 excluding nav boilerplate | Required for D-17 price filtering in Plan 03 |
| `lat` / `lng` | JSON in inline `<script>` tags: `"latitude"`, `"longitude"`, or `"lat"`, `"lng"` | **Not found** on sampled Venezia listing — map section is sitemap accordion, not geo embed |
| Location fallback | Text like `Pianiga (VE)` near title | Municipality only; no coords on this sample (D-16 fallback → null coords, D-15 zone null) |

**D-16 verdict:** Parse script JSON for lat/lng first; if absent, leave `lat`/`lng` null (do not guess from municipality in tracer).

## Pagination strategy

- **Do NOT use** `?o=` query params (disallowed in robots.txt).
- Pagination is **button-based**: `nav[class*="pagination"]` with `button[aria-label="Andare a pagina N"]`.
- Page 1 shows disabled "pagina precedente" button; page 2+ via click navigation.
- No "load more" infinite scroll observed on category pages.
- **Crawler approach:** enqueue next page by simulating button click or discovering page URL pattern from button handler (future plans); tracer uses page 1 only.

## Category URLs validated

| Slug | URL | Listings |
|------|-----|----------|
| arredamento-casalinghi | `/annunci-veneto/regalo/arredamento-casalinghi/` | 32 articles |
| elettrodomestici | `/annunci-veneto/regalo/elettrodomestici/` | 31 articles |
| bambini-giocattoli | `/annunci-veneto/regalo/bambini-giocattoli/` | 31 articles |

## Tracer extraction flow (locked for Plan 02)

1. Load first URL from `SUBITO_CATEGORY_URLS`.
2. Select first `article a[href*=".htm"]`.
3. Navigate to detail page in same Playwright context.
4. Extract all fields from detail; use card title/href as fallback.
5. Limit: **one listing**, **page 1 only**.

## Seller PII (V8 minimization)

Do **not** extract: seller name, phone, email, chat handles. Title + photo + coords + external_url only.
