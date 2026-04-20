import type { AppLanguage, AuthUser, LoginResponse } from '@chatbot-ai/shared';
import type { Request } from 'express';

import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { generateOpaqueToken, hashToken } from '../../utils/hash';
import { signAccessToken } from '../../utils/jwt';
import { sanitizeInput } from '../../utils/text';
import { AuthRepository } from './auth.repository';

const languageToPrisma: Record<AppLanguage, 'vi' | 'en' | 'bilingual'> = {
  vi: 'vi',
  en: 'en',
  bilingual: 'bilingual',
};

const toIso = (value: Date) => value.toISOString();

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  private buildUser(user: {
    id: string;
    displayName: string;
    preferredLanguage: 'vi' | 'en' | 'bilingual';
    createdAt: Date;
  }): AuthUser {
    return {
      id: user.id,
      displayName: user.displayName,
      preferredLanguage: user.preferredLanguage,
      createdAt: toIso(user.createdAt),
    };
  }

  private getRequestMeta(req: Request) {
    return {
      userAgent: req.header('user-agent') ?? undefined,
      ipAddress: req.ip ?? undefined,
    };
  }

  async loginGuest(
    input: {
      displayName: string;
      preferredLanguage: AppLanguage;
    },
    req: Request,
  ): Promise<LoginResponse> {
    const user = await this.authRepository.createGuestUser({
      displayName: sanitizeInput(input.displayName),
      preferredLanguage: languageToPrisma[input.preferredLanguage],
    });

    const refreshToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const session = await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      ...this.getRequestMeta(req),
    });

    const accessToken = signAccessToken({
      userId: user.id,
      sessionId: session.id,
    });

    return {
      user: this.buildUser(user),
      tokens: {
        accessToken,
        refreshToken,
        expiresInSeconds: env.ACCESS_TOKEN_TTL_MINUTES * 60,
      },
      session: {
        id: session.id,
        expiresAt: toIso(session.expiresAt),
        lastUsedAt: toIso(session.lastUsedAt),
      },
    };
  }

  async refresh(refreshToken: string, req: Request): Promise<LoginResponse> {
    const existingSession = await this.authRepository.getSessionByRefreshTokenHash(hashToken(refreshToken));

    if (!existingSession || existingSession.expiresAt.getTime() < Date.now()) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Session expired. Please sign in again.');
    }

    const rotatedRefreshToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const session = await this.authRepository.rotateSession({
      sessionId: existingSession.id,
      refreshTokenHash: hashToken(rotatedRefreshToken),
      expiresAt,
      ...this.getRequestMeta(req),
    });

    await this.authRepository.updateLastSeen(existingSession.userId);

    const accessToken = signAccessToken({
      userId: session.userId,
      sessionId: session.id,
    });

    return {
      user: this.buildUser(session.user),
      tokens: {
        accessToken,
        refreshToken: rotatedRefreshToken,
        expiresInSeconds: env.ACCESS_TOKEN_TTL_MINUTES * 60,
      },
      session: {
        id: session.id,
        expiresAt: toIso(session.expiresAt),
        lastUsedAt: toIso(session.lastUsedAt),
      },
    };
  }

  async logout(refreshToken: string) {
    await this.authRepository.deleteSessionByRefreshTokenHash(hashToken(refreshToken));
  }

  async me(userId: string) {
    const user = await this.authRepository.getUserById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    await this.authRepository.updateLastSeen(userId);

    return this.buildUser(user);
  }
}
