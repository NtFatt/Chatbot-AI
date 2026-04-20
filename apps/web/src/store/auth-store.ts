import type { AuthUser } from '@chatbot-ai/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  bootstrapped: boolean;
  setUser: (user: AuthUser) => void;
  setSession: (input: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
  clearSession: () => void;
  markBootstrapped: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      bootstrapped: false,
      setUser: (user) =>
        set({
          user,
        }),
      setSession: ({ user, accessToken, refreshToken }) =>
        set({
          user,
          accessToken,
          refreshToken,
        }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        }),
      markBootstrapped: () =>
        set({
          bootstrapped: true,
        }),
    }),
    {
      name: 'study-chatbot-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
