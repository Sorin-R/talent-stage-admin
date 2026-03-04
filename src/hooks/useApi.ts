import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const ABS_HTTP_URL_RE = /^https?:\/\//i;
const rawApiBase = String(import.meta.env.VITE_API_URL || '/api/admin').trim();

const normalizeApiBase = (base: string): string => {
  if (ABS_HTTP_URL_RE.test(base)) return base.replace(/\/+$/, '');
  const clean = base.replace(/^\/+/, '').replace(/\/+$/, '');
  return '/' + clean;
};

export const ADMIN_API_BASE = normalizeApiBase(rawApiBase);

const getApiOrigin = (): string => {
  if (ABS_HTTP_URL_RE.test(ADMIN_API_BASE)) {
    try {
      return new URL(ADMIN_API_BASE).origin;
    } catch {
      return '';
    }
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

export const API_ORIGIN = getApiOrigin();

export function toMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const rel = url.startsWith('/') ? url : '/' + url;
  return API_ORIGIN ? API_ORIGIN + rel : rel;
}

export function useApi() {
  const { token, logout } = useAuth();

  const api = useCallback(async <T = any>(method: string, path: string, body?: any): Promise<{ success: boolean; data?: T; error?: string }> => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers: Record<string, string> = {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    };
    if (!isFormData) headers['Content-Type'] = 'application/json';
    const opts: RequestInit = {
      method,
      headers,
    };
    if (body !== undefined && body !== null) {
      opts.body = isFormData ? body : JSON.stringify(body);
    }
    try {
      const r = await fetch(ADMIN_API_BASE + path, opts);
      if (r.status === 401) { logout(); return { success: false, error: 'Session expired' }; }
      const j = await r.json();
      return j;
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [token, logout]);

  return api;
}
