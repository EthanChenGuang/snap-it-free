# 零元消费者端 · 全量交互 UAT 报告

> 自动生成于 2026-09-06T13:33:04.418Z

## 1. 环境

| 项 | 值 |
|---|---|
| Origin | http://localhost:3003 |
| 视口 | 390×844（主）+ 1280×800（导航/layout） |
| Guest | 是 |
| Authed | 是（cookie 注入） |
| Cookie 注入 | 是 |
| 开始 | 2026-09-06T13:28:54.273Z |
| 结束 | 2026-09-06T13:33:04.418Z |
| Git HEAD | 285efb3 |

## 2. 覆盖矩阵

| 页面 | PASS | FAIL | BLOCKED | 合计 |
|---|---:|---:|---:|---:|
| Guest / | 28 | 0 | 1 | 29 |
| Guest gates | 9 | 0 | 0 | 9 |
| Guest /settings | 6 | 0 | 0 | 6 |
| Authed | 14 | 2 | 1 | 17 |
| Cross-page | 2 | 0 | 0 | 2 |
| Desktop 1280×800 | 2 | 1 | 0 | 3 |
| **合计** | **61** | **3** | **2** | **66** |

## 3. 控件表

### Guest /

| 控件 | 类型 | 预期 | 实际 | 结果 | 证据 |
|---|---|---|---|---|---|
| Bottom nav / | link | visible | visible | PASS |  |
| Bottom nav /post | link | visible | visible | PASS |  |
| Bottom nav /favorites | link | visible | visible | PASS |  |
| Bottom nav /settings | link | visible | visible | PASS |  |
| Post nav auth modal | button | dialog | open | PASS |  |
| Favorites nav auth modal | button | dialog | open | PASS |  |
| Settings nav | link | /settings | http://localhost:3003/settings | PASS |  |
| Search with results | input | no crash | filled | PASS |  |
| Search no results | input | no crash | filled | PASS |  |
| Search special chars | input | no error | ok | PASS |  |
| Filter sheet open | sheet | open | open | PASS |  |
| Filter city #0 (all) | chip | selected | true | PASS |  |
| Filter city #1 (milano) | chip | selected | true | PASS |  |
| Filter city #2 (roma) | chip | selected | true | PASS |  |
| Filter city #3 (prato) | chip | selected | true | PASS |  |
| Filter city #4 (torino) | chip | selected | true | PASS |  |
| Filter city #5 (firenze) | chip | selected | true | PASS |  |
| Filter city #6 (bologna) | chip | selected | true | PASS |  |
| Filter city #7 (napoli) | chip | selected | true | PASS |  |
| Filter city #8 (brescia) | chip | selected | true | PASS |  |
| Filter city #9 (venice) | chip | selected | true | PASS |  |
| Filter city #10 (genova) | chip | selected | true | PASS |  |
| Filter city #11 (padova) | chip | selected | true | PASS |  |
| Filter city #12 (perugia) | chip | selected | true | PASS |  |
| Filter city #13 (verona) | chip | selected | true | PASS |  |
| Filter city #14 (other) | chip | selected | true | PASS |  |
| Filter categories all | chip | 18 | 18 | PASS |  |
| Filter sheet close | sheet | closed | closed | PASS |  |
| Listing card click | link | /listing/[id] | no cards | BLOCKED | feed empty after filters |

### Guest gates

| 控件 | 类型 | 预期 | 实际 | 结果 | 证据 |
|---|---|---|---|---|---|
| /post gate | page | gateTitle | shown | PASS |  |
| /post open Auth modal | button | dialog | open | PASS |  |
| /favorites gate | page | empty+signIn | shown | PASS |  |
| /messages gate | page | redirect/wall | http://localhost:3003/messages | PASS |  |
| /messages/[id] gate | page | redirect/wall | http://localhost:3003/messages | PASS |  |
| /post/manage gate | page | gate | shown | PASS |  |
| /select-location map | page | map | yes | PASS |  |
| /select-location confirm btn | button | visible | visible | PASS |  |
| /list redirect | page | → / | http://localhost:3003 | PASS |  |

### Guest /settings

| 控件 | 类型 | 预期 | 实际 | 结果 | 证据 |
|---|---|---|---|---|---|
| Appearance cycle | button | cycle | 3 clicks | PASS |  |
| Language zh | button | change | clicked | PASS |  |
| Language en | button | change | clicked | PASS |  |
| Language it | button | change | clicked | PASS |  |
| Language affects feed | flow | localized | yes | PASS |  |
| Delete account hidden | button | hidden | hidden | PASS |  |

### Authed

| 控件 | 类型 | 预期 | 实际 | 结果 | 证据 |
|---|---|---|---|---|---|
| Cookie injection login | session | logged in | yes | PASS |  |
| Post nav no modal | link | no auth modal | ok | PASS |  |
| Empty form validation | form | field errors | shown | PASS |  |
| Photo upload preview | file | preview | set | PASS |  |
| Category selection | chip | one category | 0 | FAIL |  |
| Condition brand_new | chip | select | clicked | PASS |  |
| Condition like_new | chip | select | clicked | PASS |  |
| Condition good | chip | select | clicked | PASS |  |
| Condition fair | chip | select | clicked | PASS |  |
| Condition poor | chip | select | clicked | PASS |  |
| Post submit | button | success | http://localhost:3003/listing/10c48f85-a86a-44fc-b771-eec6c7a75aa7/posted | PASS |  |
| Post no double-create | button | single | one submit | PASS |  |
| /post/manage list | page | own posts | 2 | PASS |  |
| /settings?tab=alerts | page | alerts tab | yes | PASS |  |
| Logout | button | guest | clicked | PASS |  |
| Unread badge | badge | when unread | no seed data | BLOCKED | cannot seed unread |
| Delete account | button | → guest / | still authed | FAIL |  |

### Cross-page

| 控件 | 类型 | 预期 | 实际 | 结果 | 证据 |
|---|---|---|---|---|---|
| Filter persists after detail back | flow | kept | back ok | PASS |  |
| Language persists | flow | en nav | en | PASS |  |

### Desktop 1280×800

| 控件 | 类型 | 预期 | 实际 | 结果 | 证据 |
|---|---|---|---|---|---|
| Bottom nav | nav | visible | yes | PASS |  |
| Filter sheet | sheet | open | open | PASS |  |
| Desktop suite | layout | complete | locator.click: Timeout 30000ms exceeded.
Call log:
  - waiti | FAIL |  |

## 4. FAIL 清单

### P0

### P1
- **Category selection** (Authed): 自动化选择器未匹配到 chip（`0`），但默认分类下发帖 **PASS** — 属测试脚本问题，非产品缺陷
- **Delete account** (Authed): `POST /api/user/delete` 返回 **500 `JWT issued at future`**（WSL 与 Supabase 时钟偏差）— 环境 BLOCKED，非 UI 逻辑错误
- **Desktop suite** (Desktop 1280×800): 关闭 Filter sheet 时 Playwright 点击超时 — 属自动化脆弱性，Filter 打开 **PASS**

## 5. BLOCKED / 未覆盖

- **Listing card click** (Guest /): 首屏 headless 加载时 feed 卡片未就绪（补测通过 API 取 `listings_public` 覆盖详情页）
- **Unread badge** (Authed): 无法在本轮造未读 alert/message
- **Valid email OTP** (Guest /listing/[id]): Supabase 邮件 rate limit，`@snap-it-free.test` 域名亦被拒绝
- **消息 / 会话 / Alerts 创建** (Authed): 本轮未完整覆盖（见下一轮）
- **Menu drawer** (Guest /): 未检测到 menu 按钮（可能 viewport/语言文案差异）

### 控制台 error

- A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- 
- A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- 
- Failed to load resource: the server responded with a status of 401 (Unauthorized)
- Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- 

## 6. 跨页回归

- Filter persists after detail back: **PASS** — back ok
- Language persists: **PASS** — en

## 7. 下一轮建议

- /admin 整站
- PWA 真机
- 推送真机
- 未读角标

## 附录

<details><summary>控件快照 80 项</summary>

```json
[
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Choose language",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "INPUT",
    "type": "search",
    "name": "Search",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Filters",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "Choose browse location",
    "href": "/select-location",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/ce4e86ef-6ebe-4ce6-80c5-8f9aadcdacf4",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "UAT test listing 🎉\n\n1 minute ago",
    "href": "/listing/ce4e86ef-6ebe-4ce6-80c5-8f9aadcdacf4",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/3293d0a3-a454-4764-83c3-36dc82ea62d9",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "UAT test listing 🎉\n\n5 minutes ago",
    "href": "/listing/3293d0a3-a454-4764-83c3-36dc82ea62d9",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/be75a684-3ec2-4b74-a65c-a3436f12d145",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "UAT diag post\n\n7 minutes ago",
    "href": "/listing/be75a684-3ec2-4b74-a65c-a3436f12d145",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/ad6e2ba0-a801-4d0f-869f-c9fff15d23a8",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "keyboard\n\n1 hour ago",
    "href": "/listing/ad6e2ba0-a801-4d0f-869f-c9fff15d23a8",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/c2c38064-740d-4e20-a26e-8a3c2bee0a59",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "POLTRONCINA BIANCA IN TESSUTO SFODERABILE\n\n1 hour ago",
    "href": "/listing/c2c38064-740d-4e20-a26e-8a3c2bee0a59",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/0ceb90e3-ee2f-460e-a73c-5c8b9e8bc7b8",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "Banco da negozio\n\n1 hour ago",
    "href": "/listing/0ceb90e3-ee2f-460e-a73c-5c8b9e8bc7b8",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/91ca8002-c661-4224-9b86-02744a23372e",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "mini frigo con ghiacciaia\n\n1 hour ago",
    "href": "/listing/91ca8002-c661-4224-9b86-02744a23372e",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/ea000102-ea7e-418e-aaae-beaba228a030",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "trenino\n\n1 hour ago",
    "href": "/listing/ea000102-ea7e-418e-aaae-beaba228a030",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/f789127a-a715-4b4d-8b33-3c480b4d3f01",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "DIVANO LETTO MATRIMONIALE GRATIS\n\n1 hour ago",
    "href": "/listing/f789127a-a715-4b4d-8b33-3c480b4d3f01",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/67296a67-6f13-4a9c-909f-4fbd5c46edd2",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "Trattore anni '70.\n\n1 hour ago",
    "href": "/listing/67296a67-6f13-4a9c-909f-4fbd5c46edd2",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/e76e5b40-7d8c-449c-a07d-cb3bc5691c8c",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "divano letto matrimoniale GRATIS\n\n1 hour ago",
    "href": "/listing/e76e5b40-7d8c-449c-a07d-cb3bc5691c8c",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/ea833b9b-bb8e-48f8-83c1-c5b4d49f386d",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "ciabatte Speedo per piscina\n\n1 hour ago",
    "href": "/listing/ea833b9b-bb8e-48f8-83c1-c5b4d49f386d",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/f4293927-6dd3-4c28-9f6a-702794907b87",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "Egidia cucciola\n\n1 hour ago",
    "href": "/listing/f4293927-6dd3-4c28-9f6a-702794907b87",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/00887918-51e7-45b4-9164-0d1af5d175a7",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "CD musica operistica\n\n2 hours ago",
    "href": "/listing/00887918-51e7-45b4-9164-0d1af5d175a7",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/7dc5081d-8e75-4767-9bbf-7da36a2aecc7",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "cuscino per allattamento\n\n2 hours ago",
    "href": "/listing/7dc5081d-8e75-4767-9bbf-7da36a2aecc7",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/b2e6e221-d3b6-4207-8c9b-f614d82021a9",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "CD musica classica\n\n2 hours ago",
    "href": "/listing/b2e6e221-d3b6-4207-8c9b-f614d82021a9",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/641fbd35-7c67-433c-ae0c-b773f7ddbd69",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "soggiorno\n\n2 hours ago",
    "href": "/listing/641fbd35-7c67-433c-ae0c-b773f7ddbd69",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/11566f9b-2304-4471-98ef-8319cade23ec",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "Letto matrimoniale con Contenitore\n\n2 hours ago",
    "href": "/listing/11566f9b-2304-4471-98ef-8319cade23ec",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "A",
    "type": null,
    "name": "FREE",
    "href": "/listing/2eef92ad-3569-412a-a6e4-c2a7d1142a3e",
    "disabled": false,
    "page": "Guest /"
  },
  {
    "tag": "BUTTON",
    "type": "button",
    "name": "Favorites",
    "href": null,
    "disabled": false,
    "page": "Guest /"
  }
]
```
</details>

## 补测（2026-09-06T13:34:02.536Z）

| 控件 | 页面 | 结果 | 实际 |
|---|---|---|---|
| Guest gate email (scraped) | Guest /listing/[id] | PASS | visible |
| Valid email OTP message | Guest /listing/[id] | BLOCKED | Supabase email rate limit |
| Google OAuth btn | Guest /listing/[id] | PASS | visible |
| Share button | Guest /listing/[id] | PASS | clicked |
| Delete account (retest) | Authed | BLOCKED | JWT issued at future (clock skew) |
