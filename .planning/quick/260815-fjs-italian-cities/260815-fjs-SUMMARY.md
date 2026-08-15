---
quick_id: 260815-fjs
status: complete
date: 2026-08-15
---

# Quick Task 260815-fjs — Summary

## Done

- 新增 9 城统一目录（威尼斯、帕多瓦 + 米兰、佛罗伦萨、罗马、那不勒斯、佩鲁贾、都灵、普拉托）
- Subito regalo URL 支持多 region 模板 `/annunci-{region}/regalo/{slug}/{city}/{city}/`
- Scraper bbox 校验与消费者城市筛选同步扩展
- Admin Regalo URL 矩阵与推荐种子更新为 153 条 URL（17 分类 × 9 城）
- 中/英/意三语城市标签

## Key files

- `lib/geo/italian-cities.ts` — canonical catalog
- `scraper/src/geo/italian-cities.ts` — scraper mirror
- `lib/i18n/city-labels.ts` — message → label helper
- `components/listings/FilterSheet.tsx` — 9 城筛选 chips

## Verification

- `npm test` — lib/admin/listings/hooks tests pass
- `cd scraper && npm test` — schema/extract/normalize pass

## Next

- 在 admin 应用推荐种子并运行 scraper 抓取新城市数据
- 新城市 listing 入库后，消费者筛选即可看到结果
