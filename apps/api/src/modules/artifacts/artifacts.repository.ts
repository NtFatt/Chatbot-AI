import type { ArtifactType } from '@prisma/client';

import { prisma } from '../../config/prisma';

export class ArtifactsRepository {
  async create(input: {
    userId: string;
    sessionId?: string;
    messageId?: string;
    type: ArtifactType;
    title: string;
    content: object;
    qualityScore?: number | null;
  }) {
    return prisma.studyArtifact.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId ?? null,
        messageId: input.messageId ?? null,
        type: input.type,
        title: input.title,
        content: input.content,
        qualityScore: input.qualityScore ?? null,
      },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.studyArtifact.findFirst({
      where: { id, userId },
      include: {
        session: { select: { title: true } },
      },
    });
  }

  async findByShareToken(shareToken: string) {
    return prisma.studyArtifact.findFirst({
      where: { shareToken },
    });
  }

  async listByUser(userId: string, params: {
    sessionId?: string;
    type?: ArtifactType;
    limit: number;
  }) {
    return prisma.studyArtifact.findMany({
      where: {
        userId,
        ...(params.sessionId ? { sessionId: params.sessionId } : {}),
        ...(params.type ? { type: params.type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      include: {
        session: { select: { title: true } },
      },
    });
  }

  async listBySession(sessionId: string, userId: string) {
    return prisma.studyArtifact.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: 'desc' },
      include: {
        session: { select: { title: true } },
      },
    });
  }

  async searchByUser(
    userId: string,
    query: string,
    limit: number,
    type?: ArtifactType,
  ): Promise<Array<{
    id: string;
    type: ArtifactType;
    title: string;
    sessionId: string | null;
    session: { title: string } | null;
    content: unknown;
    isFavorited: boolean;
    createdAt: Date;
  }>> {
    return prisma.studyArtifact.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          {
            content: {
              path: ['$', 'array', '$', 'front'],
              string_contains: query,
            },
          },
          {
            content: {
              path: ['$', 'array', '$', 'question'],
              string_contains: query,
            },
          },
          {
            content: {
              path: ['$', 'array', '$'],
              array_contains: query,
            },
          },
          {
            content: {
              path: ['body'],
              string_contains: query,
            },
          },
        ] as unknown as undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        session: { select: { title: true } },
      },
    }) as Promise<Array<{
    id: string;
    type: ArtifactType;
    title: string;
    sessionId: string | null;
    session: { title: string } | null;
    content: unknown;
    isFavorited: boolean;
    createdAt: Date;
  }>>;
  }

  async listFavorites(userId: string) {
    return prisma.studyArtifact.findMany({
      where: { userId, isFavorited: true },
      orderBy: { updatedAt: 'desc' },
      include: {
        session: { select: { title: true } },
      },
    });
  }

  async setFavorite(artifactId: string, userId: string, favorited: boolean) {
    return prisma.studyArtifact.update({
      where: { id: artifactId },
      data: { isFavorited: favorited },
      include: {
        session: { select: { title: true } },
      },
    });
  }

  async setShareToken(artifactId: string, userId: string, shareToken: string) {
    return prisma.studyArtifact.update({
      where: { id: artifactId },
      data: { shareToken },
      include: {
        session: { select: { title: true } },
      },
    });
  }

  async clearShareToken(artifactId: string, userId: string) {
    return prisma.studyArtifact.update({
      where: { id: artifactId },
      data: { shareToken: null },
      include: {
        session: { select: { title: true } },
      },
    });
  }

  async delete(id: string, userId: string) {
    await prisma.studyArtifact.deleteMany({
      where: { id, userId },
    });
  }
}
