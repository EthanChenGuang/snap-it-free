---
slug: translation-queue-cost-dashboard
date: 2026-08-12
---

# Plan: Translation Queue Cost Dashboard

Integrate global expense KPI cards and per-listing cost pills on the admin Translation Queue page.

## Tasks

1. **translation-cost lib** — Token/cost estimation, formatting, summary builder
2. **queries + API** — Server summary from config + translated listing counts; `/api/admin/translation/cost`
3. **UI components** — `TranslationCostKpiGrid`, `TranslationListingCostPill`
4. **TranslationQueueClient** — Wire KPI grid below header, cost pill beside listing ID
