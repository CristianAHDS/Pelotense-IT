import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext(null);

const API = API_URL;

const GUEST_USER = { nome: 'Convidado', tipo: 'convidado', guest: true };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('pelotense_token');
    const savedUser = localStorage.getItem('pelotense_user');
    const isGuest = localStorage.getItem('pelotense_guest') === '1';
    if (isGuest) {
      try { setUser(savedUser ? JSON.parse(savedUser) : GUEST_USER); } catch (_) { setUser(GUEST_USER); }
      setLoading(false);
      return;
    }
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)); } catch (_) {}
      }
      fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setUser(data);
            localStorage.setItem('pelotense_user', JSON.stringify(data));
          } else if (!savedUser) {
            localStorage.removeItem('pelotense_token');
            setToken(null);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback((newToken, userData) => {
    localStorage.setItem('pelotense_token', newToken);
    localStorage.setItem('pelotense_user', JSON.stringify(userData));
    localStorage.removeItem('pelotense_guest');
    setToken(newToken);
    setUser(userData);
  }, []);

  useEffect(() => {
    const refreshUser = () => {
      const savedToken = localStorage.getItem('pelotense_token');
      const isGuest = localStorage.getItem('pelotense_guest') === '1';
      if (isGuest || !savedToken) return;
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data) {
            setUser(data);
            localStorage.setItem('pelotense_user', JSON.stringify(data));
          }
        })
        .catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUser();
    };
    window.addEventListener('focus', refreshUser);
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(refreshUser, 60000);
    return () => {
      window.removeEventListener('focus', refreshUser);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, []);

  const loginAsGuest = useCallback(() => {
    localStorage.setItem('pelotense_guest', '1');
    localStorage.setItem('pelotense_user', JSON.stringify(GUEST_USER));
    localStorage.removeItem('pelotense_token');
    setToken(null);
    setUser(GUEST_USER);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pelotense_token');
    localStorage.removeItem('pelotense_user');
    localStorage.removeItem('pelotense_guest');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
