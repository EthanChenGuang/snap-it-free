# snap-it-free verification map

Baseline: a build launched by `scripts/launch.sh`, healthy per `scripts/doctor.sh`, driven by `scripts/drive.mjs` at 390x844 with the language preference seeded to English unless a recipe says otherwise. Default locale of the app is zh.

| Feature | File | Journey |
| --- | --- | --- |
| Pre-browse onboarding | [onboarding.md](onboarding.md) | `onboarding`, `persist` |
| Hard paywall and locked views | [paywall.md](paywall.md) | `onboarding`, `desktop-paywall`, `persist` |
| Feed home (flag off) | [feed-home.md](feed-home.md) | `flag-off`, `compare` |

Report an unreachable path with the command and the unmet precondition. Do not count a skipped entry point as verified through another one.
