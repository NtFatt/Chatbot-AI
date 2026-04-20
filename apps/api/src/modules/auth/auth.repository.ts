import type { PreferredLanguage } from '@prisma/client';

import { prisma } from '../../config/prisma';

export class AuthRepository {
  async createGuestUser(input: { displayName: string; preferredLanguage: PreferredLanguage }) {
    return prisma.user.create({
      data: {
        displayName: input.displayName,
        preferredLanguage: input.preferredLanguage,
      },
    });
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async updateLastSeen(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        lastSeenAt: new Date(),
      },
    });
  }

  async createSession(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return prisma.authSession.create({
      data: input,
    });
  }

  async getSessionByRefreshTokenHash(refreshTokenHash: string) {
    return prisma.authSession.findUnique({
      where: { refreshTokenHash },
      include: {
        user: true,
      },
    });
  }

  async rotateSession(input: {
    sessionId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return prisma.authSession.update({
      where: { id: input.sessionId },
      data: {
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        lastUsedAt: new Date(),
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      },
      include: {
        user: true,
      },
    });
  }

  async deleteSessionByRefreshTokenHash(refreshTokenHash: string) {
    return prisma.authSession.deleteMany({
      where: { refreshTokenHash },
    });
  }
}
