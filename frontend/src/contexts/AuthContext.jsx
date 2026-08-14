import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext(null);

const API = API_URL;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('pelotense_token');
    const savedUser = localStorage.getItem('pelotense_user');
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
    setToken(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pelotense_token');
    localStorage.removeItem('pelotense_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
