import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png', 'pwa-maskable-512.png'],
      manifest: {
        name: 'PULSE — A Fresh Start To Get Healthy',
        short_name: 'PULSE',
        description: 'Coach-led workouts, yoga, healthy recipes and a wellness library.',
        theme_color: '#F97316',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Full-bleed with safe-zone padding so Android launchers can crop to any shape.
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        importScripts: ['/push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api', networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/media/image'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Never cache video — always stream.
          { urlPattern: ({ url }) => url.pathname.startsWith('/media/video'), handler: 'NetworkOnly' },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/media': 'http://localhost:4000',
    },
  },
});
