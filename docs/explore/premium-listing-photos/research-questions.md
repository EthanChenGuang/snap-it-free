---
title: 待研究问题 — premium listing photos
date: 2026-11-08
---

# 待研究问题

| # | 问题 | 为什么重要 | 怎么回答 |
|---|---|---|---|
| RQ-1 | 每天活跃用户（DAU）和每人平均看多少张图？ | 决定精选图流量是否超出 Supabase Free（约 5 GB/月，未核实） | Vercel Analytics / Supabase usage 页 |
| RQ-2 | Supabase Free 的真实存储 / 出站流量额度是多少？cached egress 是否单独计？ | 当前数字来自第三方汇总，未核实 | https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/settings/billing/usage 与官方定价页 |
| RQ-3 | Cloudflare R2 是否仍免出站流量、免费额度多少？ | 免费版下替代 Supabase Storage 的首选 | 官方定价页核实 |
| RQ-4 | 视觉 AI 质检（"完整/单件/无 logo"）能否做到 0 漏放？单价多少？ | 半自动审核虽有人兜底，质检越准 owner 越省时间 | spike 002：在 spike 001 的 15 张 + 更多样本上测 |
| RQ-5 | Fly.io worker 现有内存/CPU 是否能跑 birefnet-lite（224 MB 模型、~7 s/张）？ | 决定是否需要升级机器或改用托管推理 | 查看 worker 规格与 run 时的资源占用 |
| RQ-6 | PRODUCT.md 与实际数据不一致（全国范围、约 6 个月有效期 vs 文档的 Veneto + 48 h） | 影响"首页给谁看什么"和精选候选池 | 与 owner 确认后更新 PRODUCT.md |
