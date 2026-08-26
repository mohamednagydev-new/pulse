import { create } from 'zustand';
import { api, setAccessToken, IS_NATIVE, getNativeRefreshToken, setNativeRefreshToken } from '../lib/api';
import { refreshSocketAuth, disconnectSocket } from '../lib/socket';
import { track } from '../lib/track';
import { detectPlatform } from '../lib/install';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isCoach?: boolean;
  coachVerified?: boolean;
  /** False until the coaching intake is finished. Lives on the account, not the
   *  browser, so it follows the person across devices and sign-in methods. */
  onboarded?: boolean;
}

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mobile?: string;
  zip?: string;
}

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authed' | 'guest';
  bootstrap: () => Promise<void>;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/** The account's preferredLang drives push/reminder language server-side. Older
 *  accounts predate the sync (everyone was "en"), so heal any drift from the
 *  device's actual UI language on every app open. Fire-and-forget. */
function syncLangToAccount(user: { preferredLang?: string } | null) {
  const lang = localStorage.getItem('fitit_lang') || 'ar';
  if (user?.preferredLang && user.preferredLang !== lang) {
    api.patch('/api/me', { preferredLang: lang }).catch(() => {});
  }
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  bootstrap: async () => {
    set({ status: 'loading' });
    const ok = await api.refresh();
    if (ok) {
      try {
        const user = await api.get('/api/me');
        set({ user, status: 'authed' });
        syncLangToAccount(user);
        refreshSocketAuth(); // the socket may have tried (and failed) before the token existed
        track('app-open', detectPlatform()); // platform analytics: ios-app / twa / pwa / web
        return;
      } catch {
        /* fall through */
      }
    }
    set({ status: 'guest' });
  },

  login: async (email, password, remember = true) => {
    const { accessToken, user, refreshToken } = await api.post('/api/auth/login', { email, password, remember });
    setAccessToken(accessToken);
    setNativeRefreshToken(refreshToken); // native only — no-op on the web (field absent anyway)
    set({ user, status: 'authed' });
    syncLangToAccount(user);
    refreshSocketAuth();
    track('app-open', detectPlatform());
  },

  register: async (data) => {
    const { accessToken, user, refreshToken } = await api.post('/api/auth/register', data);
    setAccessToken(accessToken);
    setNativeRefreshToken(refreshToken);
    set({ user, status: 'authed' });
    refreshSocketAuth();
    track('app-open', detectPlatform());
  },

  logout: async () => {
    // Native carries its refresh token in the body (no reliable cookie in the
    // WKWebView) so the server can revoke the right session row.
    await api.post('/api/auth/logout', IS_NATIVE ? { refreshToken: getNativeRefreshToken() } : undefined);
    setAccessToken(null);
    setNativeRefreshToken(null);
    disconnectSocket();
    set({ user: null, status: 'guest' });
  },

  refreshUser: async () => {
    const user = await api.get('/api/me');
    set({ user });
  },
}));
