import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  transpilePackages: ['maplibre-gl'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.subito.it' },
      { protocol: 'https', hostname: '**.sbito.it' },
      { protocol: 'https', hostname: 'images.subito.it' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
};

export default withSerwist(nextConfig);
