import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createAuthRoutes } from '../src/modules/auth/auth.routes';

const fakeResponse = {
  user: {
    id: 'user-1',
    displayName: 'Lan Anh',
    preferredLanguage: 'bilingual' as const,
    createdAt: new Date().toISOString(),
  },
  tokens: {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresInSeconds: 1800,
  },
  session: {
    id: 'session-1',
    expiresAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  },
};

describe('auth routes', () => {
  it('returns a guest login session payload', async () => {
    const app = express();
    app.use(express.json());

    const authService = {
      loginGuest: vi.fn().mockResolvedValue(fakeResponse),
      refresh: vi.fn(),
      me: vi.fn(),
      logout: vi.fn(),
    };

    app.use('/api/auth', createAuthRoutes(authService as never));

    const response = await request(app).post('/api/auth/login').send({
      mode: 'guest',
      displayName: 'Lan Anh',
      preferredLanguage: 'bilingual',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tokens.accessToken).toBe('access-token');
    expect(authService.loginGuest).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid guest login payloads', async () => {
    const app = express();
    app.use(express.json());

    const authService = {
      loginGuest: vi.fn(),
      refresh: vi.fn(),
      me: vi.fn(),
      logout: vi.fn(),
    };

    app.use('/api/auth', createAuthRoutes(authService as never));

    const response = await request(app).post('/api/auth/login').send({
      mode: 'guest',
      displayName: 'A',
      preferredLanguage: 'bilingual',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(authService.loginGuest).not.toHaveBeenCalled();
  });
});
