# 零元 / ZeroDollar: new onboarding modelled on Snag, built for sign-up + paid conversion

Status: proposal only. No code changed; production untouched. Based on `SPEC.md` (Snag teardown) and branch `feat/stripe-subscriptions` (`components/onboarding/*`, `lib/paywall/*`, `PRODUCT.md`, `DESIGN.md`).

## 1. What we have today (and why it converts poorly)

Current flow (`lib/paywall/onboarding-flow.ts`): `welcome → how → city → alerts → paywall`. Each step is one 80px icon box, a headline, and text.

| Problem | Where | Effect on conversion |
|---|---|---|
| The first two screens are a Material icon + text; no product imagery | `StepHero` in `OnboardingFlow.tsx` | No "3-second hook". Snag leads with a collage of desirable objects |
| No personalization beyond city | reducer | No investment before the ask, and nothing personal to show on the paywall |
| Real teaser exists but is small (4 thumbs in a bordered box on the city step) | `CityTeaserPanel` | Our strongest honest asset (real count + real photos) is buried |
| **No account step.** Checkout needs a session, so a guest who taps the CTA gets `signInRequired` → "Go to Settings" | `PaywallScreen` notice branch | **Biggest leak:** the buyer is sent out of the flow at peak intent. It also caps sign-ups |
| Alerts step asks for push before the user has an account, so it fails with `notLoggedIn` for most new users | `pushResultMessage` | Permission ask wasted |
| Paywall headline "ZeroDollar Plus" + generic benefits; CTA "Continue" | `messages.*.paywall` | No personalization, no loss framing, vague CTA |

## 2. Proposed flow (Snag's structure, honest version)

Snag's spine: hook → product → alerts priming → social proof → (rating) → account → location → local count + pins → blurred feed → paywall. Ours keeps the spine, drops the rating ask and fake proof, and adds a short real personalization quiz. Snag shows no evidence of a quiz; we add it because we can turn the answers into real filters and alerts.

```
P1 Hook ─ P2 How it works ─ P3 Interests ─ P4 Getting around ─ P5 City/location
   ─ P6 Your feed (real, blurred) ─ P7 Account ─ P8 Alerts ─ P9 Paywall ─ P10 Done / Locked feed
```
The progress bar covers P1–P8 (8 segments, existing `IntroHeader`). Skip stays in the header, but from P3 on it jumps to **P6** (the personal preview), not straight to the paywall, so skippers still see the value. Back works on every step.

### P1 · Hook (replaces `welcome`)
- **Snag parallel:** "Get Anything For FREE" + object collage + claimed count (SEEN).
- **Ours:** a collage of up to 6 **real** recent listing photos (circles/rounded tiles, gentle float-in). Headline with one underlined word (existing `EmphasisTitle`). Below it, one **live** line: the real number of active listings in Veneto inside the feed window, from `listings_paywall_teaser(p_city => null)`. The line is hidden if the count is 0 or errors. No "claimed so far" number: we don't track claims.
- Reuse: `ListingPhoto`, `fetchPaywallTeaser`/`teaserFromListings`, `EmphasisTitle`, `IntroHeader`, `CompactLocaleChip`. New: `PhotoCollage` (monochrome, `rounded-2xl` photo radius per DESIGN.md, no shadows).
- Technique: value demo, real social proof of supply.

### P2 · How it works (replaces `how`)
- **Snag parallel:** "Discover Free Items Around You" + "Save Your Favorite Finds" frames (SEEN).
- **Ours:** three rows, each with a small real visual instead of an icon box: (1) Subito + street-find source chips → one feed; (2) a mini feed card built with the real `ListingCard` look, FREE badge, distance · "posted 12 min ago" taken from a real listing; (3) map + favorites. All copy is factual.
- Reuse: `FreeBadge`, `ListingCard` styles, `FeatureRow`. New: `MiniFeedCard` (static, non-interactive).

### P3 · What are you looking for? (NEW, quiz Q1, multi-select)
- Chips: Furniture · Electronics · Clothes · Books · Home & decor · Everything. These map 1:1 to `LISTING_CATEGORIES` in `lib/listings/categories.ts`.
- Answers are **used**: the feed category filter, alert keywords (P8), and the count on P6. Continue is disabled until at least one chip is picked; Skip is still allowed.
- Reuse: `Button` `chip`/`chipActive` variants (as on today's city step), `CategoryFilterChips` labels.
- Technique: personalization + investment (light sunk cost), honest because the answers change the product.

### P4 · How do you get around? (NEW, quiz Q2, single-select)
- On foot (≈1 km) · Bike / vaporetto (≈5 km) · Car (≈15 km). This sets the default radius in the existing filter sheet (1–50 km). It matters locally: Venice centro on foot vs Mestre by car.
- Reuse: filter-prefs storage (`lib/filter-prefs/storage.ts`), radius filter. New: one small reducer field.

### P5 · Your city (existing `city` step, expanded)
- City chips (existing) + optional "Use my location" (existing `LocateMeButton` / Select Location map) for distance sorting. The location permission is asked **only** on tap, with a one-line reason above the button (priming).
- Teaser count updates live for city + interests.
- Reuse: `CONSUMER_CITY_FILTER_ORDER`, `useCityTeaser`, `LocateMeButton`.
- Data note: counting by category needs an extra `p_category` argument on `listings_paywall_teaser` (a new migration after 044). Until then, P5–P6 show the city count only. Do not fake a category count.

### P6 · Your feed is ready (NEW, the Snag "N items in your area" moment, done honestly)
- 0.8–1.5 s "building your feed" checklist (city ✓ · interests ✓ · radius ✓). It runs **only while the real teaser request is in flight**, with no artificial wait.
- Then: the real count ("**23** free items in Venezia right now") and a 2-column grid of **blurred real photos** (existing `LockedFeed` visual), with a small lock badge. If the count is low, we say so and suggest widening the radius. Snag reviews show that hiding thin supply backfires.
- CTA: "Save my feed" → P7. Secondary: "See plans" → P9.
- Reuse: `LockedFeed`, `fetchPaywallTeaser`.
- Technique: curiosity gap / loss aversion on **real** items, labour-perception (real work only), personalization payoff.

### P7 · Create your free account (NEW; replaces the dead-end `signInRequired` notice)
- "Save your feed and alerts": **Continue with Google** (existing `lib/auth/use-oauth-sign-in.ts`) and **Email link** (existing OTP flow in `AuthPromptForm` / `GuestAuthGateCard`). "Not now" is visible.
- Before the OAuth/OTP redirect, persist the onboarding state (step, city, interests, radius) to `sessionStorage` and resume at P8 on return (new `onboarding_resume_v2` key).
- An optional unticked checkbox for product emails (enables future win-back; GDPR opt-in).
- Technique: account before payment, as Snag does (REPORTED). Placed after investment, so the reason to sign up is to keep what the user just built.

### P8 · Alerts (existing `alerts` step, now after sign-in so it works)
- **Snag parallel:** lock-screen notification stack (SEEN, store frame).
- **Ours:** a lock-screen mock with 2–3 notifications built from the user's interests and city, explicitly labelled "Example" ("Esempio" / "示例"). Then "Turn on alerts". On success, create one keyword+city alert from the P3 answers (existing `lib/alerts` + `AlertCreateSheet` logic) and say so. iOS not installed → the existing A2HS guide at the end (unchanged behaviour).
- Technique: permission priming in context.

### P9 · Paywall (redesign of `PaywallScreen`)
Top to bottom:
1. ✕ close, top-right, **visible from the first frame** (PRODUCT.md "honest paywall"). Snag's low-contrast "SKIP" is a pattern we reject.
2. Headline personalised with real data: "Unlock 23 free items in Venezia". If there is no count: "See every free item near you".
3. Small strip of 3 blurred real photos (from P6).
4. Four benefit checks (existing copy, tightened): every active listing from all sources · full feed, map, filters · your alerts for "furniture, books" · new items every day.
5. **Honest proof line** (only real numbers): "{n} new free items in Veneto in the last 7 days" from a DB count. No stars, testimonials, "Top 10" or ratings until we have verifiable ones.
6. Plan cards (existing radio group), **yearly preselected** and highlighted:
   - Yearly €19.99 · **€0.38/week** · tag "Save 66% vs monthly" (true: 19.99 vs 4.99×12 = 59.88)
   - Monthly €4.99 · €1.15/week
   - Weekly €1.99
   - The total billed amount ("Billed €19.99 per year") sits in the same card at the same size as the per-week figure.
7. CTA: "Unlock my feed". Under it, the existing renewal line ("€19.99 per year. Renews automatically until you cancel. Cancel anytime.").
8. Restore · Terms · Privacy (existing).
- **Optional A/B (not default):** a 7-day free trial on yearly, with a timeline "Today €0 → Day 5 reminder email → Day 7 €19.99". This needs Stripe `trial_period_days`, a reminder email, and legal copy, so it is not in the current code.
- EU: Checkout must collect the consumer's express request to start immediately and acknowledge the loss of the 14-day withdrawal right for digital content/services (CRD 2011/83/EU art. 16(m); Codice del Consumo art. 59). This goes into Guang's pending legal review.

### P10 · After
- Paid → "You're in" toast → feed opens with city + interests + radius applied → (iOS) A2HS guide.
- Closed → `LockedFeed` with the real count and a persistent "See plans" button (existing). Tapping a locked card opens `PaywallDialog` (existing). Unlike Snag, search and filters stay usable on the locked feed: they only change the count and the blurred photos, which shows value instead of a paywall on every tap.

## 3. Conversion techniques: adopt / adapt / reject

| Technique (Snag evidence) | Decision | Where | Why |
|---|---|---|---|
| Value demo before the ask (S1, S4) | **Adopt** with real data | P1, P2, P6 | Our teaser RPC already returns real count + photos; Snag's mock-data version is what produced its bait-and-switch reviews |
| Personalization quiz (not in Snag) | **Add** | P3, P4 | Investment before the ask, and the answers become real filters/alerts and personalise the paywall |
| Location relevance "N items in your area" (S5) | **Adopt, real** | P5, P6, P9 headline | Real count for the chosen city; low supply shown honestly |
| Labour-perception "building your feed" | **Adopt, constrained** | P6 | Only while a real request runs; no fake delay |
| Curiosity gap: blurred items (S4, S5) | **Adopt** | P6, P9, locked feed | Already allowed by PRODUCT.md (blurred real photos + real count) |
| Account before paywall (S4–S6) | **Adopt** | P7 | Fixes our `signInRequired` dead end; required for checkout, alerts, win-back |
| Permission priming (S1 frame) | **Adopt** | P5 (location), P8 (push) | In context, after the user's own choice; "Example" label on the mock |
| Urgency from real freshness ("1 min ago") | **Adopt** | P2, P6 | Real `created_at` / distance only |
| Price anchoring per week (S3) | **Adopt, honest** | P9 | Per-week figure next to an equally visible total; savings % computed from our own plan prices |
| Yearly as default plan (S3) | **Adopt** | P9 | Already `highlighted: true` in `plans.ts`; all three plans stay visible |
| Free trial (not in Snag) | **Option, A/B later** | P9 | Reviews complain about no trial; needs Stripe + legal work |
| Loss framing copy ("why pay…") | **Adapt** | P9 | Frame the *items* as free, never the *subscription* (see "free" risk below) |
| Win-back email (S6) | **Adopt later, opt-in only** | P7 checkbox | GDPR consent |
| Onboarding funnel analytics (S6) | **Adopt** | all steps | Track step_view / step_complete / skip / paywall_view / checkout_start / purchase, with cookie consent. No events exist today |
| Volume claims "80,000+/week", "430,200+ claimed" (S1, S2) | **Reject as-is**; use only DB-backed numbers | — | Unverifiable numbers break UCPD and PRODUCT.md "Do not fabricate" |
| Testimonial wall, "9k+ 5-star", "Top 10" (S2, S3) | **Reject** until real, verified reviews exist | — | Omnibus fake-review blacklist; we have no store ratings |
| Rating prompt before use (S5) | **Reject** | — | Skews reviews; not applicable to a PWA |
| "Get everything for free with Snag" on a paid paywall (S3) | **Reject** | — | UCPD Annex I #20 ("free" when the user must pay); extra-sensitive with the name 零元/ZeroDollar |
| "SAVE 90%" not supported by the shown prices (S3) | **Reject** | — | Misleading price claim; ours must be arithmetically true |
| Mock local items / pins before purchase (S1, S5) | **Reject** | — | Misleading action + bait-and-switch; caused Snag's 1★ wave |
| Low-contrast SKIP, no ✕ (S3) | **Reject** | — | Dark pattern; contradicts PRODUCT.md |
| Paywall on every tap incl. search (S4) | **Soften** | P10 | Keep search/filter usable on the locked feed; lock only detail/favorites |
| Countdown or "offer ends" timers (not seen in Snag) | **Reject** | — | Fake scarcity is blacklisted (UCPD Annex I #7) |

Legal flags above are a product-risk checklist, not legal advice. They belong in Guang's pending legal review together with the subscription Terms.

## 4. Copy (en / it / zh)

Brand per locale follows current messages: en "ZeroDollar", it "ZeroEuro", zh "零元". `{n}`/`{city}` are real values; lines that depend on them are hidden when the value is missing.

| Key | en | it | zh |
|---|---|---|---|
| P1 title (emphasis) | Free stuff near you, every day (**Free**) | Cose **gratis** vicino a te, ogni giorno | 身边的**免费**好物，每天都有 |
| P1 body | We gather free items from Subito and neighbours' street finds into one feed. | Raccogliamo in un unico feed gli oggetti in regalo su Subito e quelli trovati per strada dai vicini. | 我们把 Subito 上的赠送信息和邻居发现的街边好物汇集到一个信息流里。 |
| P1 live line | {n} free items active in Veneto right now | {n} oggetti gratis disponibili in Veneto in questo momento | 威尼托大区此刻有 {n} 件免费物品 |
| P2 title | One feed instead of five apps (**One**) | **Un** solo feed invece di cinque app | **一个**信息流，代替五个 App |
| P2 rows | Subito + street finds, newest first · Distance and posting time on every card · Map and favourites when you need them | Subito + ritrovamenti in strada, dai più recenti · Distanza e ora di pubblicazione su ogni scheda · Mappa e preferiti quando servono | Subito + 街边发现，最新的在前 · 每张卡片显示距离和发布时间 · 需要时可用地图和收藏 |
| P3 title | What are you looking for? (**looking**) | Cosa stai **cercando**? | 你在**找**什么？ |
| P3 hint | Pick as many as you like. We'll use them for your feed and alerts. | Scegline quante vuoi. Le useremo per il tuo feed e gli avvisi. | 可多选，我们会用它们设置你的信息流和提醒。 |
| P3 chips | Furniture · Electronics · Clothes · Books · Home & decor · Everything | Mobili · Elettronica · Abbigliamento · Libri · Casa e decorazioni · Tutto | 家具 · 电子产品 · 衣物 · 书籍 · 家居装饰 · 全部 |
| P4 title | How do you get around? (**around**) | Come ti **muovi**? | 你平时怎么**出行**？ |
| P4 options | On foot (~1 km) · Bike or vaporetto (~5 km) · Car (~15 km) | A piedi (~1 km) · Bici o vaporetto (~5 km) · Auto (~15 km) | 步行（约 1 公里）· 自行车或水上巴士（约 5 公里）· 开车（约 15 公里） |
| P5 title | Where should we look? (**look**) | Dove **cerchiamo**? | 我们在哪里帮你**找**？ |
| P5 location reason | Optional: share your location to sort items by distance. | Facoltativo: condividi la posizione per ordinare gli oggetti per distanza. | 可选：共享位置后按距离排序。 |
| P6 building | Building your feed… | Stiamo preparando il tuo feed… | 正在生成你的专属信息流… |
| P6 result | {n} free items in {city} right now | {n} oggetti gratis a {city} in questo momento | {city} 此刻有 {n} 件免费物品 |
| P6 low supply | Only {n} right now in {city}. Try a wider radius or another city. | Per ora solo {n} a {city}. Prova un raggio più ampio o un'altra città. | {city} 目前只有 {n} 件。可以扩大范围或换个城市。 |
| P6 CTA | Save my feed | Salva il mio feed | 保存我的信息流 |
| P7 title | Save your feed and alerts (**Save**) | **Salva** feed e avvisi | **保存**你的信息流和提醒 |
| P7 body | A free account keeps your city, interests and alerts on every device. | Un account gratuito conserva città, interessi e avvisi su tutti i dispositivi. | 免费账号会在所有设备上保存你的城市、兴趣和提醒。 |
| P7 buttons | Continue with Google · Email me a sign-in link · Not now | Continua con Google · Inviami un link di accesso · Non ora | 使用 Google 继续 · 发送登录链接到邮箱 · 暂不 |
| P7 opt-in | Send me occasional product emails (optional) | Inviami email occasionali sul servizio (facoltativo) | 偶尔给我发送产品邮件（可选） |
| P8 title | Be first to new finds (**first**) | Arriva **prima** sulle novità | **第一时间**知道新好物 |
| P8 mock label | Example | Esempio | 示例 |
| P8 mock line | Free bookshelf · 0.6 km · Cannaregio | Libreria in regalo · 0,6 km · Cannaregio | 免费书架 · 0.6 公里 · Cannaregio |
| P8 CTA / secondary | Turn on alerts · Not now | Attiva gli avvisi · Non ora | 开启提醒 · 暂不 |
| P9 title | Unlock {n} free items in {city} | Sblocca {n} oggetti gratis a {city} | 解锁 {city} 的 {n} 件免费物品 |
| P9 title fallback | See every free item near you | Vedi tutti gli oggetti gratis vicino a te | 查看你身边的所有免费物品 |
| P9 proof line | {n} new free items in Veneto in the last 7 days | {n} nuovi oggetti gratis in Veneto negli ultimi 7 giorni | 过去 7 天威尼托新增 {n} 件免费物品 |
| P9 yearly tag | Save 66% vs monthly | Risparmi il 66% rispetto al mensile | 比月付省 66% |
| P9 billed line | Billed €19.99 per year | Addebito di 19,99 € all'anno | 每年扣费 €19.99 |
| P9 CTA | Unlock my feed | Sblocca il mio feed | 解锁我的信息流 |
| P9 note | The items are free; the subscription pays for finding them all in one place. | Gli oggetti sono gratis; l'abbonamento paga il servizio che li raccoglie in un unico posto. | 物品是免费的；订阅费用于把它们集中到一个地方。 |

The P9 note directly defuses the UCPD "free" risk and the most common Snag complaint ("it's not free if I pay").

## 5. Implementation map (for a later code task, not done now)

| Area | Change | Files |
|---|---|---|
| State machine | `INTRO_STEPS = ['hook','how','interests','mobility','city','preview','account','alerts']`; state gains `interests[]`, `radiusKm`, `locationGranted`; Skip from step ≥3 → `preview`; resume-from-storage action | `lib/paywall/onboarding-flow.ts` (+ tests) |
| Gate | Bump `ONBOARDING_COMPLETED_STORAGE_KEY` to `_v2` so non-subscribers see the new flow once; never show it to subscribers | `lib/paywall/gate.ts` |
| Screens | Split `OnboardingFlow.tsx` (442 lines) into per-step components; new `PhotoCollage`, `MiniFeedCard`, `BuildingFeed`, `AccountStep`, `AlertsMock` | `components/onboarding/steps/*` |
| Paywall | Personalized title, photo strip, proof line, savings tag, billed line, CTA copy, inline sign-in instead of the `/settings` redirect | `components/onboarding/PaywallScreen.tsx`, `lib/paywall/plans.ts` (add `savingsVsMonthlyPct()` computed, not hardcoded) |
| Data | Optional `p_category` on the teaser RPC + "new in last 7 days" count via a security-definer function (new migration after 044; **do not apply to prod without Guang**) | `supabase/migrations/045_*` |
| Prefs | Write interests/radius/city to filter prefs; create an alert from interests after push succeeds | `lib/filter-prefs/storage.ts`, `lib/alerts/db.ts` |
| Copy | All keys above in 3 locales | `messages/{zh,en,it}.ts` |
| Analytics | Funnel events, consent-gated | new `lib/analytics/onboarding.ts` |
| Design | Stitch tokens only: black primary CTA, `outline-variant` borders, Inter, Material Symbols, no red theme, no shadows; photos `rounded-2xl`; motion = existing 240 ms slide/fade, reduced-motion respected | `DESIGN.md` unchanged |

Open questions for Guang:
1. Allow "Not now" on the account step (more completes, fewer sign-ups) or require an account before the paywall (Snag-like, more sign-ups, more drop-off)? Recommendation: allow it, but the paywall CTA signs in inline.
2. Run the 7-day trial A/B now or after launch?
3. Approve a new teaser migration (category filter + 7-day count) or ship city-only counts first?
4. Should we spend effort on the REA/APK route to recover Snag's exact in-app strings? It means downloading and decompiling their APK, which is legally grey. Not done.

## Decisions (Guang, 2026-10-28 18:39 Rome)
- Account step: sign-up is REQUIRED (no "Not now").
- Free trial: NOT at launch; A/B test a 7-day trial after launch.
