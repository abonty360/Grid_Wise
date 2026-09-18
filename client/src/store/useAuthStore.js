import { create } from 'zustand';

const TOKEN_KEY = 'gridwise_token';
const USER_KEY = 'gridwise_user';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  isAuthenticated: Boolean(localStorage.getItem(TOKEN_KEY)),

  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  isAdmin: () => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return false;
    try {
      const u = JSON.parse(userStr);
      return u?.role === 'admin';
    } catch {
      return false;
    }
  },
}));
