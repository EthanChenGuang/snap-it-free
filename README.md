# 手慢无 (ShouManWu) — Venice Free Finds

Map-first browsing app for free listings scraped from Subito.it in Venice.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies: `npm install`
2. Copy `.env.local.example` to `.env.local` and set Supabase public keys
3. Start the Next.js app: `npm run dev`
4. Open http://localhost:3000

The legacy Vite prototype under `src/` is deprecated; use Next.js App Router routes (`app/`).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server (primary) |
| `npm run build` | Production build (`next build --webpack` for MapLibre) |
| `npm run start` | Production server |
| `npm run test:lib` | Vitest suite for `lib/` |
| `npm run dev:vite` | Legacy Vite prototype only |

## Environment

See `.env.local.example` for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
