import type { CapacitorConfig } from '@capacitor/cli';

/**
 * PULSE native shell. Assets are BUNDLED (webDir: dist) — there is deliberately
 * no server.url: the app must work offline-first and pass App Store review as
 * a real app, not a remote-URL wrapper. The web bundle it wraps must be built
 * with `vite build --mode ios` so VITE_API_BASE (see .env.ios) points every
 * /api, /media and socket.io call at https://pulse.geddo.online.
 */
const config: CapacitorConfig = {
  appId: 'online.geddo.pulse',
  appName: 'PULSE',
  webDir: 'dist',
  ios: {
    scheme: 'PULSE',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
