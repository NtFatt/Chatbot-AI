import type { ApiEnvelope, LoginResponse } from '@chatbot-ai/shared';

import { useAuthStore } from '../store/auth-store';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  retryOnAuth?: boolean;
};

const parseJson = async <T>(response: Response) => {
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.success ? response.statusText : payload.error.message || 'Request failed unexpectedly.',
    );
  }

  return payload.data;
};

const refreshAuth = async () => {
  const store = useAuthStore.getState();

  if (!store.refreshToken) {
    throw new Error('No refresh token available.');
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refreshToken: store.refreshToken,
    }),
  });

  const data = await parseJson<LoginResponse>(response);

  useAuthStore.getState().setSession({
    user: data.user,
    accessToken: data.tokens.accessToken,
    refreshToken: data.tokens.refreshToken,
  });

  return data.tokens.accessToken;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}) => {
  const store = useAuthStore.getState();
  const headers = new Headers(options.headers ?? {});

  if (!options.skipAuth && store.accessToken) {
    headers.set('Authorization', `Bearer ${store.accessToken}`);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && options.retryOnAuth !== false && store.refreshToken) {
    try {
      const nextAccessToken = await refreshAuth();
      headers.set('Authorization', `Bearer ${nextAccessToken}`);

      const retried = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
      });

      return parseJson<T>(retried);
    } catch (error) {
      useAuthStore.getState().clearSession();
      throw error;
    }
  }

  return parseJson<T>(response);
};
