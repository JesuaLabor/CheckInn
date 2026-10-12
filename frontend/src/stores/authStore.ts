import { create } from 'zustand';
import { api } from '../api/client';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  quickLogin: (accountKey: 'guest' | 'pine_staff' | 'firstinn_staff' | 'pine_admin' | 'breeze_owner' | 'superadmin') => Promise<boolean>;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('checkinn_user') || 'null'),
  token: localStorage.getItem('checkinn_token') || null,
  isLoading: false,
  error: null,

  setSession: (token: string, user: User) => {
    localStorage.setItem('checkinn_token', token);
    localStorage.setItem('checkinn_user', JSON.stringify(user));
    set({ token, user, error: null });
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login/', { username, password });
      const { access, user } = res.data;
      localStorage.setItem('checkinn_token', access);
      localStorage.setItem('checkinn_user', JSON.stringify(user));
      set({ token: access, user, isLoading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid username or password';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  quickLogin: async (accountKey) => {
    const creds: Record<string, { u: string; p: string }> = {
      guest: { u: 'juandelacruz', p: 'guest123' },
      pine_staff: { u: 'pine_staff', p: 'staff123' },
      firstinn_staff: { u: 'firstinn_staff', p: 'staff123' },
      pine_admin: { u: 'pine_admin', p: 'admin123' },
      breeze_owner: { u: 'breeze_owner', p: 'breeze123' },
      superadmin: { u: 'superadmin', p: 'admin123' },
    };

    const target = creds[accountKey];
    if (!target) return false;

    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login/', { username: target.u, password: target.p });
      const { access, user } = res.data;
      localStorage.setItem('checkinn_token', access);
      localStorage.setItem('checkinn_user', JSON.stringify(user));
      set({ token: access, user, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: 'Quick login failed.', isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('checkinn_token');
    localStorage.removeItem('checkinn_user');
    set({ token: null, user: null, error: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem('checkinn_token');
    if (!token) return;
    try {
      const res = await api.get('/auth/me/');
      localStorage.setItem('checkinn_user', JSON.stringify(res.data));
      set({ user: res.data });
    } catch {
      localStorage.removeItem('checkinn_token');
      localStorage.removeItem('checkinn_user');
      set({ token: null, user: null });
    }
  },
}));
