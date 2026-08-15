# Quick: Billing page + split Vercel/Fly.io cards

Add /admin/billing page and split overview compute card into Vercel + Fly.io.

## Plan

1. Extend platform-usage snapshot with vercel, flyio, supabase billing details, translation provider token breakdown
2. Split PlatformUsageGrid compute card into Vercel + Fly.io cards (6 total)
3. Add sidebar nav item 平台费用 (/admin/billing, credit_card icon)
4. Create BillingClient with summary, sticky anchor nav, 5 detail panels
5. Add app/admin/billing/page.tsx server route
