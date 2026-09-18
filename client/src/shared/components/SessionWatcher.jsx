import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { refreshTokenApi } from '../../api/auth.api';

export default function SessionWatcher() {
  const {
    isAuthenticated,
    token,
    refreshToken,
    expiresAt,
    updateTokens,
    logout,
  } = useAuthStore();

  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token || !expiresAt) return;

    const checkSession = async () => {
      if (isRefreshingRef.current) return;

      const remainingMs = expiresAt - Date.now();

      // Case 1: Token has expired
      if (remainingMs <= 0) {
        if (refreshToken) {
          isRefreshingRef.current = true;
          try {
            const res = await refreshTokenApi(refreshToken);
            const data = res?.data;
            if (data?.token) {
              updateTokens(data.token, data.refreshToken, data.expiresIn);
            } else {
              logout('session_expired');
            }
          } catch {
            logout('session_expired');
          } finally {
            isRefreshingRef.current = false;
          }
        } else {
          logout('session_expired');
        }
        return;
      }

      // Case 2: Proactive silent refresh (when under 3 minutes remaining and refresh token exists)
      const THREE_MINUTES_MS = 3 * 60 * 1000;
      if (remainingMs < THREE_MINUTES_MS && refreshToken) {
        isRefreshingRef.current = true;
        try {
          const res = await refreshTokenApi(refreshToken);
          const data = res?.data;
          if (data?.token) {
            updateTokens(data.token, data.refreshToken, data.expiresIn);
          }
        } catch {
          // If silent proactive refresh fails, let it continue until actual expiry
        } finally {
          isRefreshingRef.current = false;
        }
      }
    };

    // Immediate check on mount/state update
    checkSession();

    // Check periodically every 15 seconds
    const interval = setInterval(checkSession, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token, refreshToken, expiresAt, updateTokens, logout]);

  return null;
}
