const rawApi = import.meta.env.VITE_API_URL || '/api';

export const API_URL = String(rawApi).replace(/\/+$/, '');

function defaultSocketUrl() {
  if (/^https?:\/\//.test(API_URL)) {
    return API_URL.replace(/\/api\/?$/, '');
  }
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || defaultSocketUrl();
