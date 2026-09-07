# Supabase JWT Signing 迁移清单

**项目:** `wnerhajyjjmrtsdmdpzu`  
**Dashboard:** https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/settings/jwt  
**API Keys:** https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/settings/api-keys  

> 需使用 **项目 Owner** 账号登录。当前 CLI 账号对该项目返回 403，无法代你点击 Dashboard。

> ## ✅ 2026-09-06：迁移已完成，验证全部 PASS
>
> 步骤 1–5 已做完。残留的 `PGRST303 "JWT issued at future"` **与签名迁移无关** ——
> 是 PostgREST 实例缓存的「当前时间」卡住了（上游 bug），**重启项目后消失**。
> 详见 [`supabase-jwt-signing-runbook.md`](./supabase-jwt-signing-runbook.md)。
>
> 剩下的只有步骤 6（Revoke legacy）。以下内容保留作为操作记录。

## 当前探测结果（重启后）

| 探测项 | 状态 |
|--------|------|
| JWKS | ES256 `kid=8530bc5d-...` ✅ |
| `sb_publishable` + REST | **200** ✅ |
| 用户 ES256 session + REST | **200** ✅ |
| `sb_secret` + REST/RPC | **200 / 204** ✅ |
| legacy `eyJ` service role | **200** ✅（可以吊销了） |

---

## 步骤 1 — 打开 JWT Signing Keys

1. 登录 https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/settings/jwt  
2. 记录各 key 的 **Status**：

| Status | 含义 |
|--------|------|
| `in_use` | 当前 Auth 签发用 |
| `standby` | 已就绪，待 Rotate |
| `previously_used` | 上轮 rotation 的旧 key，仍接受旧 JWT |
| `revoked` | 已吊销 |

**期望最终态:** ES256 = `in_use`；legacy HS256 = `previously_used` → 再 `revoked`。

---

## 步骤 2 — Migrate JWT secret（若按钮还在）

若页面有 **「Migrate JWT secret」**：

1. 点击 **Migrate JWT secret**
2. 等待 ~5 分钟（Dashboard 对 key 状态变更有节流）
3. 确认出现 **standby** 的 ES256 key

若已迁移过（只有 ES256 in_use、无 Migrate 按钮），跳过。

---

## 步骤 3 — Rotate keys（关键）

1. 确认 ES256 key 为 **standby**（或已从 previously_used 移回 standby）
2. 点击 **Rotate keys**
3. 等待 ~5 分钟
4. 确认 ES256 → **in_use**，旧 key → **previously_used**

**注意（官方文档）:**

- 已有 session 不会立刻登出；旧 access token 在过期前仍有效
- 若 Edge Functions 开了 **Verify JWT**，rotation 后可能需关闭或改用 `getClaims()`

---

## 步骤 4 — 本地验证（每步后跑）

```bash
node scripts/verify-supabase-jwt-signing.mjs
```

**迁移完成的判据（全部 PASS）:**

```
publishable REST (apikey)     → 200
user ES256 session REST       → 200
sb_secret REST                → 200
legacy JWT REST (if configured) → 200
Verdict: MIGRATION COMPLETE
```

若 Rotate 后 **用户 session 仍 401**，等待 10–20 分钟（JWKS 边缘缓存），再重跑。仍失败 → 步骤 6 开 Support ticket。

---

## 步骤 5 — API Keys 对齐

打开 https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu/settings/api-keys

1. 确认 **Publishable** / **Secret**（`sb_publishable_` / `sb_secret_`）为 **Active**
2. 复制到 env（若 Dashboard 有 Regenerate）：
   - `.env.local` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `scraper/.env` → `SUPABASE_SERVICE_ROLE_KEY`
   - Vercel / Fly.io 生产 env
3. **Legacy** `anon` / `service_role`（`eyJ...`）在 Revoke 前保持 Active（兼容期）

---

## 步骤 6 — Revoke legacy JWT secret（验证通过后）

**前置条件:** 步骤 4 全部 PASS，且 legacy `eyJ` key 的 **Last used** 为空或仅来自你的测试。

1. 在 JWT Keys 页，将 **previously_used** 的 legacy HS256 key → **Revoke**
2. Dashboard 会要求先 **Deactivate** legacy `anon` / `service_role` API keys — 按提示操作
3. 再等 access token 过期窗口（Settings → Auth → JWT expiry，通常 3600s）+ 15 分钟
4. 再次跑 verify 脚本

Revoke 后应移除 `.env.local` 中的 legacy `eyJ` fallback（`SCRAPER_ADMIN_SERVICE_ROLE_KEY` 仅保留给 `/admin` 若仍需要）。

---

## 步骤 7 — 应用侧重载

```bash
# 重启 Next.js dev server
# 重启 scraper worker（如有）
npm run dev
```

浏览器：**Sign out → Sign in**（拿 ES256 新 session），测 `/favorites`、删除账号、发帖。

---

## 若 Dashboard 已 Rotate 仍失败

开 Supabase Support ticket，附上：

```
Project ref: wnerhajyjjmrtsdmdpzu
JWKS kid: 8530bc5d-3607-4c3c-9001-79a67a43ac0d
Symptom: GoTrue issues ES256 user JWT; PostgREST returns PGRST303 "JWT issued at future"
Evidence: sb_publishable apikey-only → 200; user session + publishable apikey → 401
Reference: https://github.com/supabase/supabase/issues/49655
```

---

## 临时 workaround（代码已做）

在迁移完成前，`lib/supabase/service-role-key.ts` 会 fallback 到 legacy `eyJ` JWT；删除账号等 server 路由可用。  
**不要**把 legacy JWT 暴露到浏览器。
