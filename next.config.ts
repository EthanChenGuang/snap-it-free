import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
});

const nextConfig: NextConfig = {
  // Bake Vercel's build-time VERCEL_ENV into a NEXT_PUBLIC_ literal so client code can tell
  // production from Preview/dev at build time. Used to disable the QA account-skip stub in
  // production (lib/paywall/gate.ts isAccountSkipStubAllowed). Empty string on a local build.
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? '',
  },
  // Hide the floating "N" dev-tools badge — it overlaps the bottom nav on mobile.
  devIndicators: false,
  serverExternalPackages: ['pg'],
  // Next.js 16 returns 403 for cross-origin /_next/* dev requests (including the
  // webpack-hmr websocket). Without the tunnel/LAN hosts allowlisted, the dev
  // client never boots and the app never hydrates when opened on a phone.
  allowedDevOrigins: [
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    '*.ngrok.app',
    '*.ngrok.dev',
    '*.ngrok.io',
    '*.trycloudflare.com',
    '192.168.*.*',
    '10.*.*.*',
    // 172.16/12 — WSL2 assigns the Linux VM an address in this range, so reaching the
    // dev server by its WSL IP from a browser on the Windows host is cross-origin.
    '172.*.*.*',
    ...(process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : []),
  ],
  // Do not add maplibre-gl to transpilePackages. It spawns its tile-parsing worker via
  // `new Worker(new URL('./maplibre-gl-worker.mjs', import.meta.url))`, which webpack can
  // only turn into a worker chunk by matching that shape statically. Transpiling rewrites
  // `import.meta.url`, the match fails, no worker is emitted, and the map renders as a
  // blank canvas — the style loads but no tile is ever requested. It also ships the
  // package unminified (8 MB in dev vs the 552 KB prebuilt ESM entry).

  // Dev only: the default 60s maxInactiveAge disposes an idle entry, so the next request
  // rebuilds and re-emits app/layout.js while the dev server is already streaming that same
  // file — the response keeps the pre-rewrite Content-Length but the body is cut short on a
  // 64 KB read boundary, so hydration dies with a SyntaxError and the map hangs (260805-ws8).
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 25,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.subito.it' },
      { protocol: 'https', hostname: '**.sbito.it' },
      { protocol: 'https', hostname: 'images.subito.it' },
      { protocol: 'https', hostname: '**.vinted.net' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

// Skip the Serwist webpack plugin in dev — it only logs "Serwist is disabled" and
// service workers interfere with HMR anyway. Client-side registration stays off via
// SerwistProvider (disable={isDev}).
export default process.env.NODE_ENV === 'production' ? withSerwist(nextConfig) : nextConfig;
