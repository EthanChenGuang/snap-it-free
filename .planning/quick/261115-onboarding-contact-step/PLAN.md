# PLAN — quick 261115b: onboarding step that introduces the contact assistant

Guang (2026-11-15): the Chinese contact assistant will ship eventually; onboarding should get
one more page that explains how it works.

Plan: Fable. Build: Sonnet. Review: Opus. Design: Stitch project `196004169049733920`, screen
`7757d3648d1c44f28a5fb62952d9ccca` (`stitch/contact-step.png`, `.html`).

## Where it lives

- Branch `preview/recent-changes` only (it has both the assistant and the onboarding work).
- **Must not ship before the assistant does.** It is NOT part of the free-onboarding commits
  that go to `main` now; keep it in its own commit(s). It goes to `main` together with phase 5.

## Behaviour

- New intro step `contact`, placed after `favorites` and before `trust`
  (hook → how → weekly → map → favorites → **contact** → trust → interests → …).
- Shown in both paid and free onboarding, for app language `zh` and `en` — the same audience
  as `shouldUseContactAssistant` (`lib/contact/templates.ts`). For `it` the step is skipped in
  both directions (next/back/skip/resume), the same way `alerts` is skipped when unavailable;
  progress dots must not count a skipped step. The language can change mid-flow via the chip.
- Skippable like the other value-prop steps (it sits before `preview`).
- Copy (zh is the reference; en/it need the same keys, `it` is never shown but keeps parity):
  - Headline: 不会意大利语？/ **也能**联系卖家 ("也能" in the highlight pill)
  - Sub: 卖家都说意大利语。我们帮你写消息、看懂回复。
  - Rows: 1 选一条现成的意大利语消息 · 2 一键复制，到卖家页面粘贴发送 ·
    3 把回复贴回来，马上看到中文意思
  - Bubbles: `Ciao! È ancora disponibile?` (labelled ITALIANO) and 你好！还在吗？ (labelled 中文;
    in `en` the second bubble is "Hi! Is it still available?" labelled ENGLISH)
  - en headline: "No Italian?" / "You can **still** message the seller"
- Honest wording: we help write and read; we do not contact sellers for the user. No source
  marketplace name, no prices, no fake numbers.
- Built with the existing onboarding primitives (`pop` theme, `SnagGapSteps.tsx` patterns,
  `SymbolIcon`); match the Stitch layout and hierarchy, do not paste its raw HTML.

## Tasks

1. `lib/paywall/onboarding-flow.ts`: add `contact` to `INTRO_STEPS`; a `contactAvailable`
   style input (like `alertsAvailable`) drives skipping. Reducer tests: order, skip for `it`,
   back/next/skip/resume, both `withPaywall` modes, saved resume state from before this step
   existed still parses.
2. Step component + wiring in `OnboardingFlow.tsx`; progress dots reflect the real step count.
3. Messages zh/en/it.
4. Component tests: step renders for zh/en with the three rows; not rendered for it; the
   free-mode paid-word scan still passes with the new step included.
5. Production-style check (free mode build, Playwright 390x844, zh and en): screenshot of the
   new step in `screens/`, no overflow, Continue and Skip work. `SUMMARY.md`.
