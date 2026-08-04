---
status: testing
phase: 05-trilingual-ui-italian-english-chinese
source: [05-VERIFICATION.md]
started: 2026-08-04T18:15:00Z
updated: 2026-08-04T18:15:00Z
---

## Current Test

number: 1
name: Header language dropdown visual + instant sync
expected: |
  On map page, open header language dropdown; switch zh → en → it; open Settings without navigating away first.
  Stitch-aligned dropdown; BottomNav and page labels re-render instantly; Settings segment matches header selection.
awaiting: user response

## Tests

### 1. Header language dropdown visual + instant sync
expected: Stitch-aligned dropdown; BottomNav and page labels re-render instantly; Settings segment matches header selection.
result: [pending]

### 2. Browser first-visit seeding in real browser
expected: Clear shoumanwu_app_preferences from localStorage; set browser to it-IT; hard reload → app opens in Italiano; localStorage seeded with "language":"it".
result: [pending]

### 3. Listing detail language switch path
expected: On /listing/:id, Header hidden (DetailTopBar shown); Settings LanguageSection reachable via bottom nav and functional.
result: [pending]

### 4. End-to-end localized push notification
expected: Log in, set English, subscribe push, trigger alert match → push title/body in English; title uses title_en when column populated.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
