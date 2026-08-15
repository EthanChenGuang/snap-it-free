---
quick_id: 260815-fjs
status: planned
---

# Quick Task 260815-fjs: 扩展意大利城市搜索范围

添加米兰、佛罗伦萨、罗马、那不勒斯、佩鲁贾、都灵、普拉托到 Subito 抓取与消费者城市筛选（保留威尼斯和帕多瓦）。

## Tasks

1. **城市目录** — `lib/geo/italian-cities.ts` + scraper 镜像，含 region、bbox、Subito URL 构建/解析
2. **抓取与管理** — 更新 regalo catalog、schema bbox 校验、推荐种子 URL（17×9=153）
3. **消费者 UI** — 筛选器、i18n 标签、feed 搜索与城市过滤
