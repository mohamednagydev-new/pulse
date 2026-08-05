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
        // Stable id: the TWA wrapper (.well-known/assetlinks.json) and installed
        // PWAs key on it — never change it once shipped.
        id: '/',
        name: 'PULSE — A Fresh Start To Get Healthy',
        short_name: 'PULSE',
        description: 'Coach-led workouts, yoga, healthy recipes and a wellness library.',
        theme_color: '#F97316',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        shortcuts: [
          { name: 'Start a workout', short_name: 'Workout', url: '/workout', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          { name: 'Log a meal', short_name: 'Tracker', url: '/tracker', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          { name: 'Watch reels', short_name: 'Reels', url: '/reels', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
        ],
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
        // Top-level navigations to the API (the Google OAuth redirect from the
        // login button) and media must reach the server. Without this denylist
        // the NavigationRoute answers /api/auth/google with the cached SPA
        // shell and sign-in silently breaks once the service worker activates.
        navigateFallbackDenylist: [/^\/api/, /^\/media/],
        importScripts: ['/push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 5,
              // Bounded: personalised JSON must not accumulate forever or be
              // served arbitrarily stale after a long offline stretch.
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
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
