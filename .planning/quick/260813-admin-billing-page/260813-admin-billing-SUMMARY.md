---
status: complete
---

# Summary: Admin billing page + Vercel/Fly split

Added dedicated billing page and split overview hosting cards.

## Changes

- `lib/admin/platform-usage.ts` — vercel/flyio cards, billing detail fields, spend/safety helpers
- `components/admin/BillingClient.tsx` — full billing UI with sticky anchor nav
- `app/admin/billing/page.tsx` — server route
- `components/admin/PlatformUsageGrid.tsx` — Vercel + Fly.io cards, link to billing
- `components/admin/admin-messages.ts` — billing nav item
- `lib/admin/threshold-alerts.ts` — alert snapshot uses vercel/flyio

## Routes

- `/admin/billing` — 平台费用详细页
