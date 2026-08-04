import type { MetadataRoute } from 'next';
import { getMessages } from '@/messages';

const messages = getMessages('zh');

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: messages.app.title,
    short_name: messages.app.title,
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
