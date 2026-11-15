# SUMMARY — quick 261115b: onboarding step for the contact assistant

- New intro step `contact` between `favorites` and `trust` (`lib/paywall/onboarding-flow.ts`). `contactAvailable` on the state (default true,
  like `alertsAvailable`) is set from `isContactAssistantLanguage(language)` (new tiny export in `lib/contact/templates.ts`, also used by
  `shouldUseContactAssistant`). When false (it) the step is skipped in next/back; progress dots drop it; resume onto it lands on `trust`.
  A new `setContactAvailable` action follows the language chip mid-flow (on the step itself it moves on to `trust`). Skippable like the
  other value-prop steps; both `withPaywall` modes; old resume states still parse.
- UI: `components/onboarding/steps/ContactIntro.tsx` (`ContactBubbles`, `ContactRows`) + wiring in `OnboardingFlow.tsx`; `StepTitle` got an
  optional `className` (the title uses an explicit line break, so `whitespace-pre-line`). `SCREEN_TINT.contact` added.
- Copy: `onboarding.contact` in zh/en/it (title, emphasis, body, 3 rows, bubble labels/texts). No marketplace name, no prices; it only says we
  help write and read.
- Tests: reducer cases (order, skip for it, back/next/skip/resume, both paywall modes, old resume state), component tests (zh/en show the step
  with 3 rows, it never; paid-word scan includes the step in zh/en/it). Step-list/count assertions updated for the new step only.
- Checked in a free-mode production build (Playwright, 360 and 390 wide, zh and en): no horizontal overflow, headline not clipped, rows end
  well above the pinned Continue button (rows bottom 575-659 px vs Continue top 772 on an 844 px screen), Continue goes to `trust`; with
  language `it` the flow goes from favorites straight to trust. Dots: 13 (the contact step counted). Screenshots in `screens/`.
- Ships only with phase 5: it is its own commit, not part of the free-onboarding commits for `main`.
- Not verified: the language chip switching mid-flow in a browser (reducer-tested only); paid-mode build in a browser; `it` copy is never shown.
