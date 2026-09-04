import { create } from 'zustand';
import type { UserSummary } from '@katacraft/shared';

const STORAGE_KEY = 'kc_access_token';

interface AuthState {
  accessToken: string | null;
  user: UserSummary | null;
  /** True once we've attempted to resolve the session on app boot. */
  initialized: boolean;
  setAccessToken: (token: string | null) => void;
  setUser: (user: UserSummary | null) => void;
  login: (accessToken: string, user: UserSummary) => void;
  clear: () => void;
  setInitialized: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: sessionStorage.getItem(STORAGE_KEY),
  user: null,
  initialized: false,
  setAccessToken: (token) => {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
    set({ accessToken: token });
  },
  setUser: (user) => set({ user }),
  login: (accessToken, user) => {
    sessionStorage.setItem(STORAGE_KEY, accessToken);
    set({ accessToken, user });
  },
  clear: () => {
    sessionStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, user: null });
  },
  setInitialized: (v) => set({ initialized: v }),
}));

export function isDesignerOrAdmin(role: string | undefined): boolean {
  return role === 'DESIGNER' || role === 'ADMIN';
}
