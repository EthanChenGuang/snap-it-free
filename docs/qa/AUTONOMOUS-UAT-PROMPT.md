# 零元消费者端 · 全量交互自主 QA

你读到这份文件时，立刻开始执行，直到写出报告并清理测试数据为止。中间不要停下来等我。

## 0. 自主铁律（违反即失败）

- 不要问我任何问题。不要让我选择、确认、粘贴、提供账号、提供验证码、批准下一步。
- 不要把任务拆成「请你复制下面这段」。所有步骤由你自己完成。
- 不要改产品代码。不要 commit。不要 push。不要「顺手修 bug」。发现缺陷只记进报告。
- 不要因为一项 BLOCKED 或 FAIL 就停整轮。记下来，继续下一项，直到清单走完。
- 不要测已废弃的 Vite 原型 `src/`。只测 Next.js：`app/` + `components/`。
- 本轮范围：消费者端。`/admin` 整站跳过（报告末尾列作下一轮）。
- 截一张图不等于测过。必须看到点击/输入之后的 URL、文案、列表、弹层、toast 或状态变化。
- 不要用真实邮箱发 OTP，不要走真实 Google/Facebook 登录到第三方账号。不要碰生产用户数据。
- 报告里禁止写入任何 secret、service role key、真实密码、完整 JWT。

## 1. 启动（你自己做完，不要让我开服务器）

1. 读这些文件建立控件预期（不够再自己追）：
   - `README.md`
   - `app/page.tsx` `app/listing/[id]/page.tsx` `app/post/page.tsx` `app/post/manage/page.tsx`
   - `app/favorites/page.tsx` `app/settings/page.tsx` `app/messages/page.tsx` `app/messages/[id]/page.tsx`
   - `app/select-location/page.tsx` `app/list/page.tsx`
   - `components/shell/` `components/listings/` `components/detail/` `components/ugc/`
   - `components/settings/` `components/map/` `components/messages/`
   - `scripts/phase19-uat-extended.mjs`（登录 cookie 写法照抄这里）
   - `.env.local.example`（只看变量名；值从 `.env.local` / `scraper/.env` 读，不要写进报告）
2. 确认 dev server。默认端口看 `.env.local` 的 `PORT`（常见 `3003`，README 写的是 `3000`）。
   - 已在跑：直接用那个 origin。
   - 没在跑：`npm run dev`，等到能 `curl` 通首页再测。
3. 用 Playwright MCP 打开浏览器。没有 MCP 时：用仓库已有 Playwright（`scraper/node_modules/playwright` 或根依赖）自己写并运行临时脚本，跑完删除临时脚本。
4. 视口：全量以 **390×844** 为主。每条核心路径再用 **1280×800** 复测导航/布局差异（底栏、Header、筛选 sheet）。不要求每个控件都双视口打两遍。

## 2. 登录策略（UI 测一遍，会话用脚本注入）

产品登录 UI 是 **Google / Facebook OAuth + 邮箱 OTP**，没有密码框。因此：

**A. 一定要测登录 UI（未真正登入也算覆盖）**

- 打开 Auth 弹层 / `/post` 门禁 / `/favorites` 门禁 / 详情页 guest 墙。
- 空邮箱提交、非法邮箱、合法邮箱提交后出现「去邮箱查看」而不是白屏。
- 点 Google：允许跳到 IdP 或出现 OAuth 错误文案；不要用真实 Google 账号完成授权。点完用浏览器后退或关弹层回到本站。
- 关闭弹层后页面可滚动，`body` overflow 恢复。

**B. 已登录会话：你自己建临时用户并注入 cookie**

照 `scripts/phase19-uat-extended.mjs`：

- 用 `SUPABASE_SERVICE_ROLE_KEY`（`.env.local` 或 `scraper/.env`）`auth.admin.createUser`，邮箱形如 `uat-auto-<timestamp>@snap-it-free.test`，`email_confirm: true`，密码自定。
- `signInWithPassword` 拿到 session，写入 `sb-<projectRef>-auth-token` cookie（`base64-` + JSON session）。
- 注入后刷新，确认设置页或底栏已是登录态。
- 测完用 admin API 删用户，并删你创建的 listing / alert。
- 没有 service role key：已登录路径全部标 BLOCKED，写明缺变量名，**未登录路径仍必须测完**。

需要两个用户才能测消息时，再各建一个 buyer / owner，测完都删。

## 3. 先盘点后测试

每个路由首次进入、以及每次打开 sheet/drawer/modal/dropdown 之后，执行盘点，把新控件补进表。未进表不准标「已覆盖」。

```js
[...document.querySelectorAll(
  'button, a, input, textarea, select, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="combobox"], [role="menuitem"], [contenteditable="true"]'
)]
  .filter((el) => {
    const s = getComputedStyle(el);
    return el.offsetParent !== null || s.position === 'fixed' || s.position === 'sticky';
  })
  .map((el) => ({
    tag: el.tagName,
    type: el.type || el.getAttribute('role'),
    name:
      el.getAttribute('aria-label') ||
      el.getAttribute('name') ||
      (el.innerText || '').trim().slice(0, 80),
    href: el.getAttribute('href'),
    disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
  }));
```

控件表字段：页面 | 控件名 | 类型 | 预期 | 实际 | PASS/FAIL/BLOCKED | 证据（URL / toast / 列表条数 / 控制台 error）。

用 todo 按页面推进。每测完一页更新表。

## 4. 必须跑完的表面（按顺序，勿跳）

### A. Guest · `/`

底栏：`/`、`/post`（应弹登录，href 仍是 `/post`）、`/favorites`（应弹登录）、`/settings`。

Header：菜单抽屉（首页、发布、收藏、管理帖、设置、关闭、点遮罩关闭）、搜索开关、搜索输入、清空、语言切换（中/英/意）。

信息流：卡片点击进 `/listing/[id]`、收藏心形（guest 应登录墙）、筛选 sheet 打开/关闭。

筛选 sheet 内每个选项都要点，并看列表是否变：

- 城市：`all`、milano、roma、prato、torino、firenze、bologna、napoli、brescia、venice、genova、padova、perugia、verona、`other`
- 品类：sheet 里出现的每一个 chip（来自 `SUBITO_CATEGORY_SLUGS` + all），不是只点前三个
- 其它过滤/排序/重置若存在，全部点

空搜索、有结果搜索、无结果搜索、特殊字符搜索。滚动时底栏/顶栏显隐若存在，确认回顶后可再点。

### B. Guest · `/listing/{真实 id}`

从首页点进一条 scraped listing。测：返回、收藏（登录墙）、分享（Web Share 或复制链接）、溢出菜单、举报（打开、取消、提交若允许 guest）、联系物主/消息（登录墙）、图片画廊左右滑/点缩略图、地图块、相似推荐再点进另一条、外链（只验 `href` 与是否新开，不要在 Subito/Vinted 里继续点）、guest 预览墙/登录卡。

再开一条 UGC listing（若首页没有，登录后自己发一条再以无痕/清 cookie 回访）。

直接访问不存在的 id：应有明确空/404，不能白屏。

### C. Guest · 门禁页

- `/post`：门禁文案 + 打开 Auth + 关 Auth。
- `/favorites`：门禁，不能看到他人收藏。
- `/messages`、`/messages/任意id`：重定向或登录墙。
- `/post/manage`：门禁或空态，不能看到他人帖。
- `/select-location`：地图可拖、定位按钮、确认/取消、URL 回传参数；guest 最终发帖仍应被拦。
- `/list`：必须 permanent redirect 到 `/`。
- `/settings`：可看的项都能点；需登录的项有门禁，不能静默失败。

### D. Guest · `/settings` 不依赖账号的项

- 外观：连续点，在 light/dark（及代码里若还有 system）之间循环，刷新保持，其它页也变。
- 语言：zh / en / it 都选一遍。底栏、设置标题、筛选、详情关键文案都要变，不能只有标题变。
- 通知/推送：未登录时的展示；开/关；浏览器拒权限时不白屏。
- Advanced 重置本地数据：第一次进入确认态，第二次执行；收藏/筛选本地态被清。不要在已登录且有云端数据时误当成删号。
- Account 删除账号：未登录应不出现。

### E. Authed · 重复所有因登录解锁的控件

注入 cookie 后，把 A–C 里「应弹登录」的路径再走一遍，确认不再弹墙且功能可用。

额外必测：

**收藏**

- 详情加藏 → `/favorites` 出现 → 取消 → 列表消失。
- 首页心形与详情、收藏页三处状态一致；刷新仍在。

**发布 `/post`**

字段全部覆盖，不是只填标题：

- 照片：至少 1 张 jpeg/png/webp；删除一张；carousel / grid 切换；多张直到上限（`MAX_PHOTOS`）。非法类型若能构造则应被拒。
- 标题、描述：空、空格、正常、超长、`<script>`、emoji、中意英混合。
- 分类：`SUBITO_CATEGORY_SLUGS` 每个都点一遍，再测「清除选择」。
- 成色：所有 condition 选项都点一遍。
- 地点：走 `/select-location` 或页内地图，放到支持区域内；再测不选地点提交（应报 `locationRequiredError`）；若能点到区域外，应报 `pinOutsideSupportedArea`。
- 空表提交：标题/描述/地点校验出现在字段旁。
- 合法提交一次：成功页出现，详情能打开，`/post/manage` 能看到。
- 连点提交：不能产生两条 listing。
- 发布成功页上每个按钮都点（回首页、再发一条、查看帖子等，以实际为准）。

**`/post/manage`**

自己的帖列表；编辑/下架/删除（代码里有的都测）；状态变化后首页/详情一致。

**消息**

- 从自己的帖或对方帖打开会话（两条路径都尽量覆盖）。
- 发一条；快捷回复（若有）每条点一次。
- 关抽屉再开，记录还在。
- Safety modal / banner：打开、关闭、不再误挡发送。
- `/messages` 收件箱进入线程再返回。

**设置 · 登录后**

- 账号头/邮箱展示、登出、再注入 cookie 登入。
- 通知：推送订阅开/关；DND 开/关；`quietStart` / `quietEnd` 改时间并刷新仍在。
- Zones / Alerts：创建（关键词、城市 chip 各选几个代表 + 全城）、暂停/启用、删除、菜单里每个动作。`/settings?tab=alerts` 必须自动打开创建 sheet。
- 删除账号：只在**专用临时用户**上测（不要删还要继续用的那个）。走确认两步；成功后应回 `/` 且为 guest。若有 active claims 拦截，记实际行为。

**角标**

有未读 alert/message 时底栏角标出现；点进已读后更新或消失。造不出未读则标 BLOCKED 并写原因。

## 5. 每个控件的最低用例

**输入框**

1. 空 / 只空格  
2. 合法值  
3. 超长（200–2000）  
4. `<script>`、emoji、中意英  
5. 数字框：负、0、非数字  
6. 文件框：非图片  
7. 错误出现在字段旁，不是只有静默失败  
8. Enter / Esc 符合预期  

**选项 / 开关**

- 每一个 chip/radio/select 都点，列表或预览按该值变。
- 开关：开→关→开；该持久化的刷新后还在。
- 互斥不能同时选；可多选能取消。

**按钮**

- 可点必须有可见结果。
- disabled 在条件不满足时不可点，满足后可点。
- 破坏性按钮要有确认；取消不执行。
- 关闭后弹层消失且页面可滚。
- 连点不重复创建。

## 6. 跨页回归（单页绿、跨页红的，必须抓）

- 首页筛了城市/分类 → 进详情 → 返回，筛选还在。
- 收藏后，首页 / 详情 / `/favorites` 心形一致。
- 改语言后，底栏、设置、发帖、详情、筛选都是新语言。
- 改外观后各页一致，没有半套暗色。
- 深链：真实 `/listing/{id}`、`/settings?tab=alerts`、`/post/manage`、不存在的 listing。
- `/list` → `/`。

## 7. 判定

- **PASS**：可见结果符合代码/文案；无本站控制台 `error`。
- **FAIL**：无响应、错页、状态不同步、缺校验、丢数据、登录墙失效、连点双写、破坏性无确认。
- **BLOCKED**：缺 key / 缺权限 / 第三方未配 / 造不出数据。写明缺什么。禁止把 BLOCKED 标成 PASS。
- 地图 tile 的第三方 warning 可忽略。本站 React/Next 的 `error` 记 FAIL 附件。
- 外链只查 `href` 与是否新开。

## 8. 清理（报告写完之前做）

- 删除本轮创建的 listing、alert、会话、临时用户。
- 删除你写的一次性脚本。
- 不要还原我的 `.env`。不要 `git clean` 整个仓库。

## 9. 唯一交付物

写到 `docs/qa/consumer-interactive-uat.md`（目录没有就建）。必须含：

1. 环境：origin、视口、guest/authed、是否注入 cookie、时间；有 git 则写 HEAD short hash。
2. 覆盖矩阵：页面 × 控件数 × PASS/FAIL/BLOCKED 计数。
3. 完整控件表（或按页附录）。没进表的控件 = 未覆盖，在第 5 节列出。
4. FAIL 清单：P0 阻断 / P1 功能错 / P2 体验。每条含步骤、预期、实际、控件名、URL。
5. 未覆盖项 + 原因。
6. 下一轮建议（admin、PWA 真机、推送真机）。本轮不要做。

## 10. 完成定义

同时满足才算结束：

- Guest 与 Authed（或 Authed 整段 BLOCKED 且原因写清）都已按第 4 节跑完。
- 每个打开过的弹层都二次盘点过。
- 第 6 节跨页回归做完。
- 测试数据已清理。
- `docs/qa/consumer-interactive-uat.md` 已写入。

现在开始：先启动并盘点，再按 A→B→C→D→E→5→6→8→9 一次性做完。
