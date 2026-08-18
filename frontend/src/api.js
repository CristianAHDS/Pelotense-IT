import { API_URL } from './config';

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('pelotense_user');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function apiFetch(url, options = {}) {
  const token = localStorage.getItem('pelotense_token');
  const user = getStoredUser();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let finalUrl = url;
  const method = (options.method || 'GET').toUpperCase();
  if (token && user && user.nome && method === 'GET') {
    const sep = url.includes('?') ? '&' : '?';
    const params = new URLSearchParams();
    params.set('usuario', user.nome);
    if (user.tipo) params.set('tipo', user.tipo);
    finalUrl += sep + params.toString();
  }

  return fetch(finalUrl, { ...options, headers });
}