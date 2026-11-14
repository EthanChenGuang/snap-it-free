# Quick 261113: email sign-in uses the code flow everywhere

Bug: on a listing detail page (paywall flag off) the guest card sent the magic link and only said "click the link";
the 8-digit code in the email had nowhere to go, and the link looped back to the card.

- `GuestAuthGateCard` and `AuthPromptForm` now render `EmailCodeSignIn` (tone `plain`) instead of their own
  `signInWithOtp` form. Google button, headings, divider and close button are unchanged.
- `onSignedIn`: `useAuthSession` already picks the session up via `onAuthStateChange`; the handler additionally
  `router.replace(redirectTo)` when it differs from the current path+search, else `router.refresh()`.
- `EmailCodeSignIn` got `tone?: 'pop' | 'plain'` (default `pop`, onboarding unchanged). Plain = black primary button, zinc input,
  44px targets. Code input: numeric keypad, `one-time-code`, 8 digits.
- Wording: `emailCode.sentHint` (zh/en/it) no longer mentions tapping the link. Removed unused `auth.sendLink`, `auth.sending`,
  `auth.checkEmail` from zh/en/it.
- `supabase/templates/magic_link.html` and `confirmation.html`: link lines removed (code-only). The hosted Supabase template
  is NOT changed; the owner applies it.
- Other `signInWithOtp` callers: none left outside `components/onboarding/EmailCodeSignIn.tsx` (the only other hits were tests).
- Tests: `GuestAuthGateCard.test.tsx`, `AuthPromptForm.test.tsx`; source-regex test in `lib/auth/guest-preview-inline-auth.test.ts` updated.
- Screenshots (390x844, zh/en, email and code step, temp page deleted; OTP request intercepted, no real Supabase call):
  `screens/card-{zh,en}-{email,code}.png`. The page also shows the AuthPromptForm below the card.

Not verified: a real email/code round trip, real session pickup after `verifyOtp`, the hosted template.
