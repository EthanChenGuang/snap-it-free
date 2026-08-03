---
quick_id: 260803-wi0
status: complete
date: 2026-08-03
scope: Italy-wide free-item source candidates beyond Subito
---

# Research: Italian & European free-item sources beyond Subito

**Verdict:** Italian general classifieds have consolidated so hard that there is almost no second scraper worth building. The highest-value move is expanding the Subito adapter you already have from Veneto to national seeds. The real Italian giveaway supply lives on Facebook (unreachable) and a geo-fenced municipal app (partnership only). The best technical API we found (trashnothing) has zero Italian inventory. Wallapop has an excellent free-price JSON API but measured Italian free inventory is a rounding error (~11 items across 8 metros).

This research is evidence-based as of **2026-08-03**. It is not legal advice.

---

## Ranking criterion

`(Italy-wide free-item supply value × access legitimacy) ÷ implementation cost`, against the existing `RawListing` contract:

```ts
{ external_id, title, photo_url /* required */, external_url, lat, lng, posted_at, description? }
```

Constraints that shaped every verdict:

- Budget **$20–100/month** total — sustained residential-proxy wars against Akamai/DataDome/CloudFront do not fit.
- `photo_url` is mandatory today — text-only channels fail as written.
- App is map-first — city centroids are usable; street-level coords are a real upgrade.
- STATE.md asked for a **non-scraping fallback** for Subito legal exposure.

---

## Tiered shortlist

### Tier A — Do this (config / one-day work)

| Rank | Source | Why | Access | Italy free volume | Schema fit |
|---|---|---|---|---|---|
| **1** | **Subito national expansion** | Same extractor; Veneto is ~12% of national free inventory | Existing Playwright crawler; `robots.txt` allows `/` but **disallows `?o=` pagination** | **~39,500** national `regalo` results (live); Veneto 4,842 | 8/8 already; Venice bbox in `extract.ts` must be removed first |
| **2** | **Schema.org / Open Graph-first extractor** | Engineering that pays off for every future source; current Subito selectors fail silently | N/A (internal) | N/A | Prefer JSON-LD → Open Graph → CSS fallback with per-field null-rate alarms |

**Subito national expansion detail.** Current seeds (`scraper/src/subito/categories.ts`) are three Veneto category URLs only. National free category: `https://www.subito.it/annunci-italia/regalo/usato/` → **39,544 risultati**. Because pagination (`*?o=*`) is Disallowed, scale by **more region/province/category seeds**, not deeper crawls. Prerequisites before going national:

1. Delete / generalise the Venice-only reject box in `scraper/src/subito/extract.ts` (`lat 45.0–45.7`, `lng 12.1–12.6`).
2. Replace the 7 Venice-only entries in `scraper/src/geo/municipality-centroids.json` with ISTAT comune centroids (offline, free).
3. Filter or downrank pet-adoption noise (large share of national `regalo`).

### Tier B — Partnership / permission (not scrapers)

| Rank | Source | Why | How |
|---|---|---|---|
| **3** | **Junker "Bacheca del Riuso"** | Real free-only inventory in **110+ comuni**, including auto-feeds from municipal reuse centres | Email Junker / DNA Ambiente — they already sell the service to comuni/associations/universities. Scraping is geo-fenced to residents and clearly against stated access rules. |
| **4** | **Facebook "Te lo regalo se vieni a prenderlo" admins** | Largest real Italian free supply (order of **1M+** members across the network; photos often mandatory by group rules) | Recruit admins as publishers. **Do not scrape** — closed groups require login; that is the fact pattern *Meta v. Bright Data* does **not** protect. |

### Tier C — Technically clean, low supply (optional / later)

| Rank | Source | Why | Access | Volume | Caveats |
|---|---|---|---|---|---|
| **5** | **teloregalo.app** | Italy-only gifting app; per-listing `schema.org/Product` JSON-LD; robots allows listings; no anti-automation clause in terms | Sitemap + detail pages, no login | Sitemap = **200** listing URLs; newest `lastmod` **2026-07-11** (≈3 weeks stale as of 2026-08-03); ~50–70/month historically if sitemap is a rolling window | Comune-level geo only (`areaServed`); Firebase image URLs carry `token=` — re-check staleness before relying on them |
| **6** | **InRegalo.net / Oxido.it** | Permissive robots, Open Graph fields, sitemap `lastmod` | Sitemap + OG tags | InRegalo **15 listings in 2026 YTD**, nothing after May; Oxido ~**20 total** | Rounding error vs Subito; no coordinates |

### Tier D — Bookmark only (wrong geography or wrong volume)

| Source | Why bookmark | Why not now |
|---|---|---|
| **trashnothing.com API v1.4** | Best-designed gifting API found: `/posts/all`, incremental `/posts/all/changes`, lat/lng, photos, blurhash; free `api_key` | Italy **absent** from 60-country list; 0/7,365 groups Italian |
| **Geev** | Gifting-only, crawl-friendly, coordinate geo | France / Canada / UK only; `/it/` 404 |
| **Wallapop** | Unauthenticated JSON + `max_sale_price=0` + per-item lat/lng; item pages allowed by robots | **Measured 2026-08-03:** 8 Italian metros @ 80 km → **11 unique €0 items** total (Roma/Torino/Palermo/Firenze/Venezia = 0). Without `distance_in_km`, API returns Spanish €0 spam. Paid Italian inventory is healthy — free is not. |

### Tier E — Not viable (verified dead ends)

| Source | Status (2026-08-03) |
|---|---|
| Kijiji Italia | Shut down 31 May 2022; absorbed into Subito |
| eBay Annunci | Merged into Kijiji 2014; gone |
| Portaportese | Folded March 2020; domain NXDOMAIN |
| secondamano.it | NXDOMAIN; successor `secondamanoitalia.it` has **no free category** (~4.4k paid listings) |
| Vivastreet.it | Redirects to adult dating (`vivaincontri.it`); Cloudflare-walled |
| Bakeca.it | No free/regalo category; "annunci gratuiti" means free *posting*; sitemap "regalo" hits are puppy giveaways; hard WAF |
| Vinted | Forbids €0 listings (min €1); shipping-first |
| Facebook Marketplace / groups | Explicit `Disallow: /` + login wall + closed-group auth |
| Freecycle Italy | Small groups; membership wall; often no photo |
| Nextdoor Italy | Weak community; login + address verification despite robots allowing `/for_sale_and_free/` |
| Olio / Givore | No meaningful Italian inventory; Olio app-only |
| Zerorelativo / Reoose / loregalomanonlobutto / mollalo / regalattivo / sbaracco | Dead, parked, or hijacked |
| Italian open data "riuso" | Facility registries + aggregate tonnage only (Bologna Secondlife = 182 monthly count rows). **No item-level open data.** |
| University "bacheche" | AlmaLaurea **job boards**, not goods marketplaces |
| Telegram giveaway channels | Largest probed candidate had **16 members**; supply absent |
| Reddit | Rarely has photos; commercial API gated |
| Caritas empori | Means-tested, offline; ethically wrong target |
| Too Good To Go / Karma | Paid surplus bags, not free items |

---

## Direct answers to the research questions

### What is the best non-scraping fallback for the Subito legal blocker?

There is **no high-volume non-scraping feed** that replaces Subito in Italy. Closest defensible paths:

1. **Permission / partnership** — Junker Bacheca; Facebook group admins; eventually Subito itself if they ever offer an affiliate/API.
2. **trashnothing / Geev** — excellent APIs, wrong country today.
3. **Long-tail Italian gifting sites** — legally clean, ~10–70 listings/month combined.

Honest conclusion: the STATE.md request for a "non-scraping fallback supply plan" cannot be satisfied with volume from public Italian sources alone. UGC ("Pubblica" / street dump) and partnerships are the real hedges.

### Subito `robots.txt` — correct the project blocker

STATE.md currently says robots.txt "explicitly forbids scraping". That is **overstated**.

Fetched content (paraphrased structure):

- A **`#` comment** stating automatic access is forbidden without permission.
- Machine-readable: `User-agent: *` / `Allow: /`
- Real `Disallow`s that matter: pagination `*/?o=*`, `&o=*`, plus `/utente/`, `/vi/`, etc.
- Edge bot management (reported as Akamai and/or DataDome in different probes — unresolved which vendor) returns **403 to non-browser clients**, including sometimes for `robots.txt` itself.

Net: root paths are machine-allowed; pagination you would want is machine-forbidden; the prose comment is intent evidence for contract/bad-faith analysis but is not a parser directive. **Reword the blocker** (see STATE.md update) rather than treating it as a total ban.

### Legal framework (actionable, not exhaustive)

Not legal advice. Key EU-specific points for this product:

| Topic | Practical takeaway |
|---|---|
| **Sui generis database right** (Dir. 96/9/EC) | Central EU risk US advice misses. *Innoweb* (C-202/12) holds dedicated meta-search can be re-utilisation; **"we only link out" is not a complete defence**. |
| **Art. 7(5) repeated extraction** | Continuously refreshed small slices can still reconstitute a substantial part — your 48h rolling window helps GDPR more than the database right. |
| **DSM Art. 4 TDM** | Commercial TDM exists but Art. 4(3) opt-out + ToS can override Art. 4 + purpose may not cover republishing a consumer feed. Do not build on it. |
| **Contract** | Never create accounts / log in / click ToS anywhere. Logged-off public pages are the least-bad posture; Italian enforceability of that distinction is unverified. |
| **GDPR** | Survives even if copyright/database analysis goes your way. Keep 48h expiry, minimise fields (no seller phones/names), publish a takedown path, document a Legitimate Interests Assessment. |
| **Budget vs anti-bot** | Compliant sitemap/conditional crawls on permissive hosts: **$0 proxies**. Sustained Subito-scale bot evasion: **exceeds $20–100/month**. |

**Before pointing Subito at production:** pay an Italian IP/privacy lawyer on (1) whether Subito's DB attracts sui generis protection and (2) whether ingest-and-store is extraction/re-utilisation under *Innoweb* / Art. 7(5).

### Access-route hierarchy (reuse for every future source)

1. Official API / licence / partnership  
2. Public RSS / Atom / open data  
3. Sitemap + JSON-LD / Open Graph  
4. Plain HTML selectors  
5. Headless behind anti-bot  
6. Mobile-API reverse engineering  

Prefer **Open Graph over JSON-LD** on the Italian WordPress long tail (Yoast boilerplate JSON-LD often has no listing fields; OG usually has `og:image`, `og:title`, `article:published_time`).

---

## Measurement appendix (this session)

### Subito
- National free: **39,544** on `/annunci-italia/regalo/usato/` (classifieds stream).
- Veneto free: **4,842**.
- Alternate figure **19,386** appeared when searching with `?q=regalo` — different URL, not used as the primary national count.

### Wallapop (orchestrator re-measure, paced, 2026-08-03)
- Italian paid search near Milano works (40 items / 10 km).
- `max_sale_price=0` **without** distance → Spanish €0 spam (services/"facturas").
- `max_sale_price=0` + `distance_in_km=80` across Milano, Roma, Napoli, Torino, Palermo, Bologna, Firenze, Venezia → **11 unique IT items** (8 of them Bologna furniture posted the same day). Roma/Torino/Palermo/Firenze/Venezia: **0**.
- Conclusion: demote from "strong new source" to Tier D for free-item supply.

### teloregalo.app (orchestrator re-measure)
- Sitemap: **207** URLs, **200** `/annunci/…`.
- Newest `lastmod`: **2026-07-11**.
- Detail pages still serve `schema.org/Product` JSON-LD with `price: 0`, images, `areaServed`.
- `/annunci` index is client-rendered (SSR HTML has essentially no listing links) — explains a conflicting "Nessun annuncio" observation from one stream.

### Open data
- `dati.gov.it` "riuso" search and Bologna Secondlife dataset verified: **aggregate monthly counts only**, not listings.

---

## Recommended next actions (ordered)

1. **Expand Subito seeds nationally** + lift Venice geo hardcoding + ISTAT centroids + pet filter. Highest supply ROI.
2. **Refactor extractor** to Schema.org / Open Graph first with null-rate monitoring.
3. **Email Junker** about Bacheca data sharing for a free reuse map.
4. **Identify 3–5 "Te lo regalo" Facebook admins** and propose voluntary publishing / deep-link partnership.
5. Optionally wire **teloregalo.app** as a polite sitemap crawler (low volume, good legal posture) once geo centroids are national.
6. Register a **trashnothing** API key and shelve — free optionality if scope ever leaves Italy.
7. **Do not** invest in Wallapop free scraping, Bakeca, Vivastreet, Kijiji revival myths, Telegram, Reddit, university bacheche, or open-data reuse listings.
8. **Update legal posture docs** and get Italian counsel before production Subito crawling.

---

## Sources / workstreams

- Italian classifieds: live fetches of Subito, Wallapop, Bakeca sitemaps, Secondamano, InRegalo, Vinted, eBay, Vivastreet, Kijiji shutdown page, Portaportese DNS.
- Gifting / reuse: trashnothing OpenAPI, Freecycle, Geev, Olio, Junker, teloregalo sitemap+JSON-LD, dati.gov.it / Bologna Secondlife.
- Community + legal: university bacheche, Telegram `t.me/s/` probes, Nextdoor robots vs login, CJEU *Innoweb* / *BHB* / *Ryanair*, DSM Art. 4, Garante scraping guidance notes.

Unresolved minor discrepancies left as-is: Subito edge vendor (Akamai vs DataDome reports); exact Subito national count depends on URL (category vs `?q=`).
