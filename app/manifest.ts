import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nova Studio',
    short_name: 'Nova',
    description: 'Nova Studio et NovaIA',
    start_url: '/fr',
    display: 'standalone',
    background_color: '#FBF4E8',
    theme_color: '#FBF4E8',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'NovaIA', short_name: 'NovaIA', url: '/fr/novaia', icons: [{ src: '/icons/novaia-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  };
}
