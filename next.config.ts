import type { NextConfig } from 'next';

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

export default nextConfig;
