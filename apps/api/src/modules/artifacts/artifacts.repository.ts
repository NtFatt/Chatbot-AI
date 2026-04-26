import type { ArtifactType, Prisma } from '@prisma/client';

import { prisma } from '../../config/prisma';

export class ArtifactsRepository {
  async create(input: {
    userId: string;
    sessionId?: string;
    messageId?: string;
    type: ArtifactType;
    title: string;
    content: Prisma.InputJsonValue;
  }) {
    return prisma.studyArtifact.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId ?? null,
        messageId: input.messageId ?? null,
        type: input.type,
        title: input.title,
        content: input.content,
      },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.studyArtifact.findFirst({
      where: { id, userId },
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
    });
  }

  async listBySession(sessionId: string, userId: string) {
    return prisma.studyArtifact.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string, userId: string) {
    await prisma.studyArtifact.deleteMany({
      where: { id, userId },
    });
  }
}
