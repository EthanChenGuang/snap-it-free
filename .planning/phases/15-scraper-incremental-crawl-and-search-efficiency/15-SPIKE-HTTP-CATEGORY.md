# Wave 0 HTTP Category Spike (D-15-01 / D-15-02)

**Date:** 2026-08-11
**Overall verdict:** PASS
**Stack winner:** Crawlee HttpCrawler (got-scraping TLS) — Scrapling arm not run (optional; Crawlee default per D-15-03)

## Proxy

- **WARNING:** No proxy configured — dev/local direct fetch (D-15-17). Production requires Italian residential proxy (see ADR 015-production-proxy).

## URLs

| Label | URL | Status | Wall ms | Listings | Fields OK | Pass |
|-------|-----|--------|---------|----------|-----------|------|
| Venezia arredamento-casalinghi | https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/venezia/venezia/ | 200 | 429 | 30 | yes | ✓ |
| Padova arredamento-casalinghi | https://www.subito.it/annunci-veneto/regalo/arredamento-casalinghi/padova/padova/ | 200 | 313 | 30 | yes | ✓ |
| Veneto elettrodomestici (high volume) | https://www.subito.it/annunci-veneto/regalo/elettrodomestici/ | 200 | 440 | 30 | yes | ✓ |

## Field map (__NEXT_DATA__)

**Listing array path:** `props.pageProps.initialState.items.originalList`

| Field | JSON path | Notes |
|-------|-----------|-------|
| `external_id` | `urls.default` → regex `/-(\d+)\.htm/` | Numeric Subito ad id |
| `title` | `subject` | Card/listing title |
| `price` | `features['/price'].values[0].value` (fallback `.key`) | Regalo listings show `0 €` |
| `images` | `images[].cdnBaseUrl` | Primary = first element |
| `posted_at` | `date` | ISO-like `YYYY-MM-DD HH:mm:ss` (parse to ISO in http-extract) |
| `external_url` | `urls.default` | Detail page href |

**Venezia arredamento-casalinghi:** included — `arredamento-casalinghi/venezia/venezia/`

## Sample listing fields (first card per URL)

### Venezia arredamento-casalinghi

```json
{
  "external_id": "656979545",
  "title": "mobiletto legno",
  "price": "0 €",
  "images": [
    "https://images.sbito.it/api/v1/sbt-ads-images-pro/images/1f/1f42c45e-b720-48ea-bc45-6f4dca904710",
    "https://images.sbito.it/api/v1/sbt-ads-images-pro/images/a9/a9715dfb-9b31-4102-acb1-fa195bce7f90",
    "https://images.sbito.it/api/v1/sbt-ads-images-pro/images/fc/fc3cf6d2-e3d6-4f55-bfa2-c41867d660a0"
  ],
  "posted_at": "2026-08-11 13:00:50",
  "external_url": "https://www.subito.it/arredamento-casalinghi/mobiletto-legno-venezia-656979545.htm"
}
```

### Padova arredamento-casalinghi

```json
{
  "external_id": "656683093",
  "title": "Divano angolare Sfoderabile e Lavabile co cuscini",
  "price": "0 €",
  "images": [
    "https://images.sbito.it/api/v1/sbt-ads-images-pro/images/4f/4fbf1dfc-ff6c-4140-909b-1053f8bb3303",
    "https://images.sbito.it/api/v1/sbt-ads-images-pro/images/cb/cb0ff48b-2ad0-4d54-9523-f45559a76bd5",
    "https://images.sbito.it/api/v1/sbt-ads-images-pro/images/ee/ee8ccf93-1936-41dc-9c6e-371ffb014ab8"
  ],
  "posted_at": "2026-08-11 19:45:16",
  "external_url": "https://www.subito.it/arredamento-casalinghi/divano-angolare-sfoderabile-e-lavabile-co-cuscini-padova-656683093.htm"
}
```

### Veneto elettrodomestici (high volume)

```json
{
  "external_id": "656918089",
  "title": "Da vedere può essere interessante",
  "price": "0 €",
  "images": [
    "https://images.sbito.it/api/v1/sbt-ads-images-pro/images/cb/cb82e857-d3c7-4828-b22b-334faccc6e4f",
    "https://images.sbito.it/api/v1/sbt-ads-images-pro/images/c4/c4faf361-f6da-4552-8213-4ec1f13d5fbb",
    "https://images.sbito.it/api/v1/sbt-ads-images-pro/images/4e/4eaf8065-eef4-4530-9324-d54f40ebe704"
  ],
  "posted_at": "2026-08-11 19:43:45",
  "external_url": "https://www.subito.it/elettrodomestici/da-vedere-puo-essere-interessante-vicenza-656918089.htm"
}
```

## Timing table

| URL | Wall time (ms) | ≤2s gate (D-15-02) |
|-----|----------------|---------------------|
| Venezia arredamento-casalinghi | 429 | PASS |
| Padova arredamento-casalinghi | 313 | PASS |
| Veneto elettrodomestici (high volume) | 440 | PASS |

## TLS / got-scraping fingerprint note (D-15-22)

Primary arm uses `gotScraping` from `got-scraping@4.x` (transitive via `crawlee`) with:

```json
{
  "headerGeneratorOptions": {
    "browsers": [
      {
        "name": "chrome",
        "minVersion": 120,
        "httpVersion": "2"
      }
    ],
    "devices": [
      "desktop"
    ],
    "locales": [
      "it-IT"
    ]
  }
}
```

This generates Chrome 120+ desktop headers and browser-like TLS for plain HTTP category fetches. Production `HttpCrawler` uses the same transport (D-15-22).

## Listing order (newest-first?)

Venezia arredamento-casalinghi: yes (first=2026-08-11 13:00:50 last=2026-07-15 12:40:54)
Padova arredamento-casalinghi: yes (first=2026-08-11 19:45:16 last=2026-07-11 17:15:19)
Veneto elettrodomestici (high volume): yes (first=2026-08-11 19:43:45 last=2026-06-20 17:23:25)

**Implementation note:** Treat category card order as **newest-first** when dates are monotonic descending; Plan 15-03 early-stop walks listings in array order.

## Crawlee vs Scrapling comparison

| Arm | Block resistance | Speed (all 3 URLs) | Verdict |
|-----|------------------|--------------------|---------|
| Crawlee / got-scraping | 200 OK on all 3 | ≤2s all URLs | **Default winner (D-15-03)** |
| Scrapling (Python venv) | not run | not run | N/A — optional spike arm skipped |

## Gate criteria (D-15-02)

| Check | Required | Result |
|-------|----------|--------|
| All 3 URLs return required fields from JSON | title, price, images, posted_at, external_id | 3/3 |
| Wall time per URL | ≤2000ms | 3/3 |
| TLS fingerprint documented | got-scraping headerGeneratorOptions | yes |
| arredamento-casalinghi Venezia path | required | yes |

## Fixture

Captured sanitized `__NEXT_DATA__` fragment: `scraper/fixtures/subito-category-next-data-fragment.json` (written)

## Errors

None.

---
*Generated by scraper/scripts/spike-subito-http-category.mjs*
