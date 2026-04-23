import type { ApiEnvelope, LoginResponse } from '@chatbot-ai/shared';

import { useAuthStore } from '../store/auth-store';
import { ApiClientError, createApiClientError } from '../utils/transport-errors';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  retryOnAuth?: boolean;
};

const parseJson = async <T>(response: Response) => {
  const raw = await response.text();
  let payload: ApiEnvelope<T> | null = null;

  if (raw) {
    try {
      payload = JSON.parse(raw) as ApiEnvelope<T>;
    } catch {
      throw new ApiClientError(
        'Phản hồi từ máy chủ không đúng định dạng mong đợi.',
        response.status,
        'INVALID_SERVER_PAYLOAD',
      );
    }
  }

  if (!payload) {
    if (response.ok) {
      throw new ApiClientError('Máy chủ không trả về dữ liệu hợp lệ.', response.status, 'EMPTY_RESPONSE');
    }

    throw createApiClientError(response, undefined, 'Máy chủ trả về phản hồi rỗng.');
  }

  if (!response.ok || !payload.success) {
    throw createApiClientError(
      response,
      payload.success ? undefined : payload,
      'Yêu cầu chưa thể hoàn tất.',
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

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Không thể kết nối tới máy chủ.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (response.status === 401 && options.retryOnAuth !== false && store.refreshToken) {
    try {
      const nextAccessToken = await refreshAuth();
      headers.set('Authorization', `Bearer ${nextAccessToken}`);

      let retried: Response;
      try {
        retried = await fetch(`${API_URL}${path}`, {
          ...options,
          headers,
        });
      } catch (error) {
        throw new ApiClientError(
          error instanceof Error ? error.message : 'Không thể kết nối tới máy chủ.',
          0,
          'NETWORK_ERROR',
        );
      }

      return parseJson<T>(retried);
    } catch (error) {
      useAuthStore.getState().clearSession();
      throw error;
    }
  }

  return parseJson<T>(response);
};
