import type { AuthUser, LoginResponse } from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export const loginGuest = (input: { displayName: string; preferredLanguage: 'vi' | 'en' | 'bilingual' }) =>
  apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'guest',
      ...input,
    }),
    skipAuth: true,
    retryOnAuth: false,
  });

export const getMe = () =>
  apiRequest<AuthUser>('/api/auth/me', {
    method: 'GET',
  });

export const logout = (refreshToken: string) =>
  apiRequest<{ loggedOut: boolean }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
