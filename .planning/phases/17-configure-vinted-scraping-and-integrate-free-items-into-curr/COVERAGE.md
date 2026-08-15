# API Coverage — Vinted (vinted.it)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

Phase 17 integrates Vinted as a read-only listing supply source via session-warmed HTTP extract on admin-configured catalog URLs. Consumer claim flow opens external URLs; no Vinted account integration.

| capability | decision | reason |
|---|---|---|
| Session warm-up (catalog page GET → session cookies) | INTEGRATE | |
| GET /api/v2/catalog/items (catalog listing extract) | INTEGRATE | |
| Item detail page RSC parse (catalog_id, shipping.type) | INTEGRATE | |
| GET /api/v2/users/{id} (seller city / location) | INTEGRATE | |
| Playwright fallback on block/challenge retry | INTEGRATE | |
| €0 price filter at extract (price.amount === 0) | INTEGRATE | |
| Shipping-only rejection (local pickup required) | INTEGRATE | |
| Admin-configured catalog URLs only (no site-wide search) | INTEGRATE | |
| Vinted OAuth / user authentication | OPT-OUT | read-only scraper; no Vinted account actions |
| Vinted messaging / chat API | OPT-OUT | out of scope — claim opens external_url in new tab |
| Vinted purchase / checkout / offer API | OPT-OUT | out of scope — no in-app Vinted transactions |
| Site-wide search API / keyword crawl | OPT-OUT | D-17-03 — operator controls scope via target_urls only |
| Multi-page catalog pagination beyond first page | OPT-OUT | incremental early-stop K=5 on page 1 per URL; full refresh re-crawls page 1 |
| posted_at from Vinted payload | OPT-OUT | not present in catalog API or item RSC (Wave 0 A3); scrape run time fallback |
| Vinted webhooks / push notifications | OPT-OUT | pull-based scraper on interval; no inbound Vinted events |
| Vinted item create / update / delete | OPT-OUT | read-only supply; UGC remains separate source |
| Vinted favorites / wishlist API | OPT-OUT | consumer favorites use app heart + login gate, not Vinted API |
| Vinted GraphQL endpoints | OPT-OUT | REST catalog API + RSC item detail only |
| Vinted mobile app deep links | OPT-OUT | deferred — external HTTPS URL in new tab (D-17-28) |
| Consumer source filter API | OPT-OUT | deferred to future phase — mixed feed only (D-17-27) |
