---
title: 让免费物品"看起来贵" — 探索与决策记录
date: 2026-11-08
context: /gsd-explore 会话（Claude Code 云端会话），产出物按 owner 要求放在 docs/ 而非 .planning/
---

# 让免费物品"看起来贵"

## 问题
feed 里的物品看起来破旧、简陋。图片糊只是一部分原因；根本原因是免费物品本身就旧，
且 Subito 卖家随手拍（杂乱背景、光线差、局部入镜）。

## 已经上线的修复（分支 `claude/awesome-cray-f2zfkw`）
| 问题 | 修复 |
|---|---|
| feed 用 216×164 小图，在 3x 手机 4:5 卡片上被放大约 4 倍 | 改用 `card-desktop-new-small-2x-auto`（400×400） |
| 详情页显示 **带 Subito 水印** 的 `gallery-mobile-1x-auto`（203×270） | 改用 `card-desktop-new-small-4x-auto`（800×800，无水印），渲染时重写已存 URL |
| 无防护 | guard test：所有展示规格必须是 `*-new-*`（无水印）预设 |

图片仍然直接从 Subito CDN 加载，**这些修复不增加任何费用**。

## 决策
1. **硬性要求：永远不显示水印**（Subito logo、手机相机水印）。已写入 `CLAUDE.md`。
2. **方向：方案 2 —— 换背景 + 轻度修饰（非生成式）**。物品像素只做色阶/饱和度/锐化，
   形状和瑕疵保持原样，避免"图上很新、取货很旧"的信任落差。否决了生成式重绘（方案 3）。
3. **不对全部商品自动处理**（见 spike 001：约 1/3 失败，水印压在物品上时去不掉）。
4. **改为"今日精选"**：每天挑 15–20 件照片条件好的商品做棚拍图，放在首页顶部横滑栏；
   其余商品保持现状。
5. **挑选方式：C 半自动** —— 系统自动生成候选 + 棚拍图，owner 在后台点"通过/不要"
   （预计每天 1–2 分钟）。

## 真实数据（Supabase `listings_public`，2026-11-08）
- 在架 15,428 条，全部 Subito，全部有图；1,247 条有多图。
- 新增：近 30 天约 177 条/天（约 5,300/月），近 7 天约 156 条/天。
- 地区：拉齐奥 4,721、伦巴第 4,213、威尼托 1,703（帕多瓦 773、维罗纳 545、威尼斯 385）。
- **注意：PRODUCT.md 已过时** —— 写的是"威尼斯/帕多瓦、48 小时过期"，
  实际是全国范围、`expires_at` 约 6 个月，最早 posted_at 为 2024-12-04。

## 成本（今日精选，半自动）
| 项 | 估算 | 依据 |
|---|---|---|
| 抠图算力 | $0–3/月 | ~177 张/天 × ~7 s CPU；托管开源模型约 $0.0005/张（第三方数据） |
| 视觉 AI 质检 | ~$5/月 | ~$0.001/张，**未核实** |
| 存储 | ≈ $0 | 精选图 WebP 400×500 ≈ 12 KB / 600×750 ≈ 24 KB，过期删除 |
| 流量 | 取决于 DAU | 1000 DAU × 20 张 × 24 KB ≈ 14 GB/月 |

- 当前 Supabase 套餐：**Free**（owner 确认）。Free 出站流量约 5 GB/月（第三方数据，**未核实**），
  DAU 约 300 以上可能超额 → 先用 400×500 WebP 上线并监控；过半额度时在 Cloudflare R2 与
  Supabase Pro（$25/月）之间决定。
- 商用 API 对照：Photoroom 抠图 $0.02/张，编辑 $0.10/张；remove.bg API 据报 2026-12-01 关停。

## Spike
- [spike-001-studio-cutout](spike-001-studio-cutout/README.md) — **PARTIAL**：约 40% 真实照片效果明显更高级；
  水印压在物品上时任何模型都去不掉；完整版 BiRefNet 在 16 GB 内存里 OOM；isnet 快 8 倍但更差；
  启发式质检能拦住所有水印风险但不够准。

## 后续
- [phase-featured-picks.md](phase-featured-picks.md) — 新阶段：今日精选
- [research-questions.md](research-questions.md) — 待研究问题
- [sketch-featured-strip.html](sketch-featured-strip.html) — 今日精选栏 3 个视觉方案
