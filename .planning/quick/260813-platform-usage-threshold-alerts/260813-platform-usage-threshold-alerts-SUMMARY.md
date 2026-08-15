---
status: complete
slug: platform-usage-threshold-alerts
date: 2026-08-13
---

# Summary: Platform Usage & Threshold Alerts

Added multi-platform billing/resource monitoring to `/admin` overview:

- **5-card grid** "服务平台用量与费用": Supabase (DB/Storage/Egress progress), compute hosting (wall time + estimated cost), translation LLM (tokens + USD from `translation_usage_log`), proxy (requests + traffic + block rate), notification health (Telegram/Resend/Supabase)
- **Threshold alert banner**: macOS amber warning strip when DB >80%, translation >$10/mo, or proxy block rate >20%
- **Notification engine**: `POST /api/admin/check-threshold-alerts` with 6h cooldown, Telegram Markdown + Resend HTML via fetch
- **Data API**: `GET /api/admin/platform-usage` aggregates all metrics for the dashboard

Files: `platform-usage.ts`, `threshold-alerts.ts`, `PlatformUsageGrid.tsx`, `ThresholdAlertBanner.tsx`, `DashboardClient.tsx`, migration `027_threshold_alert_events.sql`
