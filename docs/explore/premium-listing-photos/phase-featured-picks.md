---
title: "Phase: 今日精选 (Featured Picks)"
date: 2026-11-08
status: proposed
source: docs/explore/premium-listing-photos/README.md
---

# Phase: 今日精选（Featured Picks）

**Goal:** 首页顶部每天展示 15–20 件经 owner 审核、棚拍处理（统一背景 + 轻度修饰、无水印）的
免费物品，让 app 第一印象像精品目录；其余 feed 不变。

## Requirements
- **FEAT-01** 永远不显示水印：候选图任一检查不确定即淘汰；上线图必须经 owner 通过。
- **FEAT-02** 非生成式：只允许抠图、背景合成、色阶/饱和度/锐化；不得重绘物品。
- **FEAT-03** 半自动：系统每天生成候选，owner 在 `/admin` 审核页一键 通过 / 不要；
  审核页每张显示原图 / 棚拍图对比。
- **FEAT-04** 首页 `今日精选` 横滑栏位于 feed 顶部；点开进入原商品详情页（详情页继续用原图）。
- **FEAT-05** 精选图由我们托管：WebP 400×500（卡片）为主，商品下架或过期时删除。
- **FEAT-06** 成本可见：记录每日处理张数、质检花费、存储量；流量过 Supabase Free 额度一半时告警。
- **FEAT-07** 无精选时（审核前 / 0 张通过）整栏隐藏，不显示空状态。

## Pipeline（草案）
1. **候选**：scraper 新增后，按类别（排除 `animali`）、有图、近 24 h 选出候选。
2. **抠图**：`birefnet-general-lite`（spike 001 验证，~7 s/张 CPU、224 MB 模型）在 worker 上运行；
   源图用 full-frame `gallery-desktop-2x-auto`（仅在内部处理，绝不直接展示）。
3. **质检**：spike 001 的 mask 启发式（水印区、贴边、碎片、solidity、覆盖率）+ 视觉 AI 复核
   （"物品完整？只有一件？有无 logo/文字水印？"）。
4. **合成**：暖灰渐变背景 + 柔和接触阴影，输出 4:5。
5. **审核**：`featured_candidates` 表（listing_id、processed_path、gate 结果、status: pending/approved/rejected、date）。
6. **展示**：`featured_picks` 当天 approved 记录 → 首页横滑栏。

## Open questions（见 research-questions.md）
- 抠图在 Fly.io worker 上跑还是托管（Replicate）？worker 内存 / CPU 余量？
- 存储：Supabase Storage（Free 流量约 5 GB）还是 Cloudflare R2？
- 视觉 AI 质检的准确率是否能做到"不漏放"。

## Out of scope
- 对全部 feed 商品做棚拍（spike 001 证明不可行）。
- 生成式重绘 / 场景合成。
- UGC 照片处理（后续视效果再定）。

## Suggested next GSD steps
`/gsd-sketch --wrap-up`（先在 sketch-featured-strip.html 里选定样式）→ `/gsd-discuss-phase` →
`/gsd-plan-phase` → `/gsd-execute-phase`。
