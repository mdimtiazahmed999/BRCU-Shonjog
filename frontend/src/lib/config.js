// Centralized frontend config for API and Socket URLs
// Uses Vite env vars if provided, otherwise falls back to same-origin

const origin = typeof window !== 'undefined' ? window.location.origin : '';

export const API_URL = (import.meta?.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : `${origin}/api/v1`;

export const SOCKET_URL = (import.meta?.env?.VITE_SOCKET_URL)
  ? import.meta.env.VITE_SOCKET_URL
  : origin;
