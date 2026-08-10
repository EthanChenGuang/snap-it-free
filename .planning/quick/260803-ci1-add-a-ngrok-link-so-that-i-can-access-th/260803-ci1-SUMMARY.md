---
quick_id: 260803-ci1
status: complete
date: 2026-08-03
---

# Summary: ngrok mobile access

Started ngrok tunnel to the production server on port 3001.

## Public URL

**https://roomier-leora-typhogenic.ngrok-free.dev**

Open this on your phone's browser. On first visit, ngrok's free tier may show a brief interstitial — tap "Visit Site" to continue.

## Local dashboard

- ngrok web UI: http://127.0.0.1:4040 (inspect requests while testing)

## Changes

- Started background ngrok process: `ngrok http 3001`
- Added `npm run tunnel` script to package.json for future use

## Notes

- Tunnel URL changes each time ngrok restarts (free tier). Re-run `npm run tunnel` and check http://127.0.0.1:4040 for the new URL.
- Server must be running (`PORT=3001 npm run start` or `npm run dev`) before starting the tunnel.
- For OAuth / Supabase callbacks on mobile, add the ngrok URL to allowed redirect URLs in Supabase dashboard if auth flows fail.
