---
phase: 17
slug: configure-vinted-scraping-and-integrate-free-items-into-curr
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-15
---

# Phase 17 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

> Register provenance: `<threat_model>` blocks present in all seven PLAN files (17-01 through 17-07); register merged and verified at ASVS L1 against implementation artifacts (register_authored_at_plan_time: true).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| spike runner → vinted.it HTTPS | Wave 0 spike fetches untrusted HTML/JSON into local fixtures | catalog JSON, session metadata (must not leak tokens) |
| admin operator → target_urls | Human-entered catalog URLs stored in DB, consumed by worker | HTTPS URLs (SSRF surface if unvalidated) |
| admin target_urls → crawler | DB-configured vinted.it catalog URLs drive HttpCrawler requests | catalog page HTML, API JSON |
| Vinted API JSON → http-extract | Untrusted catalog payload parsed into RawListing | item fields (id, title, price, url, photo) |
| Vinted user API → enrich | Public seller profile fields for geo gating | city, country (no email/phone) |
| worker → Supabase persist | Validated listing crosses into DB | CanonicalListing after zod + normalize gates |
| Vinted catalog_id → category map | Untrusted numeric ID mapped to internal slug enum | catalog_id → Subito regalo slug |
| proxy_enc → HttpCrawler | Decrypted proxy URL in worker memory only | proxy credentials |
| external_url → window.open | User navigates to third-party Vinted listing | HTTPS listing URL |
| feed search client | Untrusted query string matched against listing titles | search query, resolved title strings |
| Phase gate → production | Verification doc gates Phase 7 deploy | audit evidence, no credentials |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-17-01 | Information Disclosure | spike logs / SPIKE md | medium | mitigate | Spike logs status/timing only; `access_token_web` referenced in artifact as boolean flag, never logged as value (`spike-vinted-catalog.mjs`) | closed |
| T-17-02 | Tampering | malicious catalog JSON in fixtures | medium | mitigate | `http-extract.ts` maps allowlisted fields; fixtures consumed via explicit field access in tests | closed |
| T-17-SSRF | Spoofing | validateTargetUrl / spike URLs | high | mitigate | Wave 0 uses 3 hardcoded vinted.it catalog URLs; admin path: `lib/admin/url-validate.ts` enforces HTTPS + `vinted.it` host + `/catalog/\d+` path (`url-validate.test.ts`) | closed |
| T-17-SC | Tampering | npm installs | high | mitigate | Phase 17 extends existing Crawlee/scraper stack only; no new production dependencies (`17-RESEARCH.md`, phase gate grep) | closed |
| T-17-03 | Tampering | catalog API JSON | high | mitigate | Allowlisted field mapping in `http-extract.ts`; `CanonicalListingSchema.parse` at persist (`normalize.ts`, `schema.test.ts`) | closed |
| T-17-04 | Tampering | external_url | high | mitigate | Host allowlist in `normalize.ts` rejects non-`vinted.it` before persist; consumer `isAllowedExternalUrl` in `lib/listings/external-url.ts` (`normalize.test.ts`) | closed |
| T-17-05 | Information Disclosure | access_token_web in logs | medium | mitigate | Crawler uses Crawlee session pool; logs proxy host masked only (`crawler.ts` `maskProxyHost`); no cookie values logged | closed |
| T-17-PII | Information Disclosure | seller fields | medium | mitigate | `parseSellerLocation` extracts city/pickup_city/country_title only; no email/phone persisted (`enrich.ts`) | closed |
| T-17-06 | Denial of Service | Datadome block | high | mitigate | Proxy + degraded run + Playwright retry via `worker-proxy-fallback.ts`; blocked URL stats on crawl runs (Phase 15 pattern) | closed |
| T-17-07 | Tampering | item detail HTML | medium | mitigate | `parseItemDetail` regex extracts known keys; enrich rejects missing/shipping-only (`enrich.ts`, `enrich.test.ts`) | closed |
| T-17-08 | Spoofing | SSRF via admin URL | high | mitigate | Admin save validates via `validateTargetUrls` in `app/api/admin/sources/[slug]/route.ts`; worker consumes admin-validated DB URLs within operator trust boundary | closed |
| T-17-09 | Information Disclosure | proxy credentials | high | mitigate | `maskProxyHost` in `crawler.ts` and `worker-proxy-fallback.ts`; `proxy_enc` decrypted in memory only (`config-loader.ts`) | closed |
| T-17-10 | Tampering | rogue catalog_id | medium | mitigate | `mapVintedCatalogToSlug` lookup on known IDs only; unknown → null + inference; `CanonicalListingSchema` validates persisted slug | closed |
| T-17-11 | Elevation | forced usato catch-all | low | accept | D-17-18 rejects usato forcing — unmapped Vinted IDs excluded from feed by design | closed |
| T-17-12 | Tampering | malicious target URL in DB | high | mitigate | `validateTargetUrl`/`validateTargetUrls` on admin save and validate-urls API; evil host/path rejected (`url-validate.test.ts`, `app/api/admin/sources/[slug]/route.ts`) | closed |
| T-17-13 | Denial of Service | 34 URL full matrix run | medium | accept | Operator enables manually; default `enabled=false` (D-17-34) limits crawl blast radius | closed |
| T-17-14 | Open Redirect | external_url | high | mitigate | `isAllowedExternalUrl` HTTPS + host allowlist (`vinted.it`, `subito.it`); `openExternalListingUrl` no-ops on reject | closed |
| T-17-15 | XSS | search query display | low | accept | Feed search uses `includes` on resolved title strings; React JSX text interpolation; no `dangerouslySetInnerHTML` in feed components | closed |
| T-17-16 | Repudiation | missing verification | medium | mitigate | `17-VERIFICATION.md` decision table + human UAT checkpoint (`17-UAT.md`, `phase17-uat-automation.mjs`) | closed |
| T-17-17 | Information Disclosure | UAT screenshots | low | accept | Verification and UAT artifacts contain no credentials or session tokens | closed |

*Status: open · closed · open — below high threshold (non-blocking)*  
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*  
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-17-01 | T-17-11 | Unmapped Vinted catalog IDs intentionally excluded rather than forced into usato catch-all (D-17-18) | phase planning | 2026-08-15 |
| AR-17-02 | T-17-13 | Full 34-URL matrix crawl is operator-controlled; default disabled prevents accidental DoS | phase planning | 2026-08-15 |
| AR-17-03 | T-17-15 | Client-side search uses React auto-escape on title strings; no HTML rendering path | phase planning | 2026-08-15 |
| AR-17-04 | T-17-17 | UAT/verification docs scoped to structural evidence; no credential capture | phase planning | 2026-08-15 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-15 | 20 | 20 | 0 | gsd-secure-phase orchestrator (ASVS L1, plan-time register) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-15
