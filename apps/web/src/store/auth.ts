import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@syncspace/shared';
import { api } from '@/lib/api';

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  googleEnabled: boolean;
  setSession: (token: string, user: User) => void;
  signup: (email: string, name: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  checkGoogle: () => Promise<void>;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      googleEnabled: false,

      setSession: (token, user) => set({ token, user }),

      signup: async (email, name, password) => {
        set({ loading: true });
        try {
          const res = await api.post<{ token: string; user: User }>('/auth/signup', { email, name, password });
          set({ token: res.token, user: res.user });
        } finally {
          set({ loading: false });
        }
      },

      login: async (email, password) => {
        set({ loading: true });
        try {
          const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
          set({ token: res.token, user: res.user });
        } finally {
          set({ loading: false });
        }
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const res = await api.get<{ user: User | null }>('/auth/me', token);
          if (res.user) set({ user: res.user });
          else set({ token: null, user: null });
        } catch {
          set({ token: null, user: null });
        }
      },

      checkGoogle: async () => {
        try {
          const res = await api.get<{ enabled: boolean }>('/auth/google/status');
          set({ googleEnabled: res.enabled });
        } catch {
          set({ googleEnabled: false });
        }
      },

      logout: () => set({ token: null, user: null }),
    }),
    { name: 'syncspace-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);
