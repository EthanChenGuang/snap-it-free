---
status: complete
slug: translation-queue-cost-dashboard
date: 2026-08-12
---

# Summary: Translation Queue Cost Dashboard

Added translation expense monitoring to `/admin/translation`:

- **Global KPI grid** (3 cards): monthly spend + token totals, period comparison with MoM trend pill, provider cost split with progress bars
- **Inline cost pill** on each queue card with macOS-style dark tooltip (model, input/output tokens, estimated USD)
- **Data layer**: `lib/admin/translation-cost.ts` estimates from listing content + `translations_today` / translated listing counts
- **Refresh API**: `GET /api/admin/translation/cost` updates summary after retries

Files: `TranslationCostKpiGrid.tsx`, `TranslationListingCostPill.tsx`, `TranslationQueueClient.tsx`, `queries.ts`, `globals.css`
