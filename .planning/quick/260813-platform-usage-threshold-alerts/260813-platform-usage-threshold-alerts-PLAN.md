# Quick: Platform Usage & Threshold Alerts on Overview Dashboard

Implement multi-platform billing/resource aggregation panel on `/admin` overview with threshold alert banner and notification engine.

## Plan

1. **Backend aggregation** (`lib/admin/platform-usage.ts`): Supabase DB/Storage/Egress, compute hosting (Vercel+Fly wall time × $0.007/hr), translation LLM from `translation_usage_log`, proxy requests/traffic/block rate from `scrape_runs`
2. **Threshold engine** (`lib/admin/threshold-alerts.ts`): defaults (DB 80%, translation $10/mo, proxy block 20%), 6h cooldown via `threshold_alert_events`, Telegram/Resend via fetch APIs
3. **API routes**: `GET /api/admin/platform-usage`, `POST /api/admin/check-threshold-alerts`
4. **UI**: `PlatformUsageGrid` (5 cards, macOS design, font-mono metrics) + `ThresholdAlertBanner` (amber warning strip)
5. **Migration**: `027_threshold_alert_events.sql`
