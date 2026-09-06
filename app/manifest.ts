import type { MetadataRoute } from 'next';

// D-07-14: PWA manifest name/short_name is the brand-neutral literal "ZeroDollar" —
// this drives the Android/desktop install prompt and iOS A2HS label, which should
// stay consistent regardless of the visitor's browser locale. Per-locale in-app UI
// strings (zh 零元 / en ZeroDollar / it ZeroEuro) are unaffected — see messages/*.ts.
const MANIFEST_APP_NAME = 'ZeroDollar';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: MANIFEST_APP_NAME,
    short_name: MANIFEST_APP_NAME,
    description: 'Venice free finds on a map',
    display: 'standalone',
    start_url: '/',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
