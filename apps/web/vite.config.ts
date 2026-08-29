import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registration moved to main.tsx (virtual:pwa-register) so failures are
      // CAUGHT: in-app browsers (FB/TikTok Android) abort/time-out SW installs
      // routinely, and the auto-injected script let those escape as unhandled
      // rejections — 17 junk rows in the crash telemetry from one ad campaign.
      injectRegister: false,
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
        // Lets Chrome answer getInstalledRelatedApps() so the browser tab can
        // tell the app is already installed (PWA or the Play TWA) and stop
        // offering the install. No prefer_related_applications flag: our own
        // UI steers Android to Play, and the flag would kill desktop install.
        related_applications: [
          { platform: 'webapp', url: 'https://pulse.geddo.online/manifest.webmanifest' },
          { platform: 'play', id: 'online.geddo.pulse', url: 'https://play.google.com/store/apps/details?id=online.geddo.pulse' },
        ],
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
        navigateFallbackDenylist: [/^\/api/, /^\/media/, /^\/\.well-known/, /^\/privacy\.html/, /^\/support\.html/, /^\/yt\.html/],
        importScripts: ['/push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              // 3s, not 5: on a slow connection every widget on Home used to
              // hang the full timeout before falling back to cached data.
              networkTimeoutSeconds: 3,
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
  build: {
    // NOTE: emptyOutDir must stay true (default) — with accumulation the PWA
    // precache manifest globs every historical chunk (seen: 99 → 514 entries).
    // Stale-chunk clients are healed by lazyRoute()'s one-shot reload instead.
    rollupOptions: {
      output: {
        // Stable vendor chunks: the framework code changes far less often than
        // app code, so splitting it means (a) redeploys invalidate less of the
        // installed app's cache — fewer stale-chunk failures on iOS — and
        // (b) the main bundle shrinks for faster parse on phones.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          data: ['@tanstack/react-query', 'zustand', 'socket.io-client'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/media': 'http://localhost:4000',
    },
  },
});
