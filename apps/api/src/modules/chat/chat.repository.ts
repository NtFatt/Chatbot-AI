import type { MessageStatus, ProviderKey, SenderType, AIFinishReason, Prisma } from '@prisma/client';

import { prisma } from '../../config/prisma';

export interface PaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
  hasMore: boolean;
}

export interface PaginationOptions {
  cursor?: string | null;
  limit?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export class ChatRepository {
  async listSessions(userId: string, opts: PaginationOptions = {}) {
    const { cursor, limit = DEFAULT_PAGE_SIZE } = opts;

    const whereClause: Prisma.ChatSessionWhereInput = {
      userId,
      isArchived: false,
      ...(cursor
        ? {
            updatedAt: {
              lt: new Date(cursor),
            },
          }
        : {}),
    };

    const [sessions, totalCount] = await Promise.all([
      prisma.chatSession.findMany({
        where: whereClause,
        orderBy: [{ isPinned: 'desc' }, { pinnedAt: 'desc' }, { updatedAt: 'desc' }],
        take: limit,
        ...(cursor ? { skip: 1 } : {}),
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { messages: true, studyArtifacts: true },
          },
        },
      }),
      prisma.chatSession.count({ where: { userId, isArchived: false } }),
    ]);

    const nextCursor =
      sessions.length === limit ? sessions[sessions.length - 1]!.updatedAt.toISOString() : null;

    return {
      items: sessions,
      nextCursor,
      totalCount,
      hasMore: nextCursor !== null,
    };
  }

  async listArchivedSessions(userId: string, opts: PaginationOptions = {}) {
    const { cursor, limit = DEFAULT_PAGE_SIZE } = opts;

    const whereClause: Prisma.ChatSessionWhereInput = {
      userId,
      isArchived: true,
      ...(cursor
        ? {
            archivedAt: {
              lt: new Date(cursor),
            },
          }
        : {}),
    };

    const [sessions, totalCount] = await Promise.all([
      prisma.chatSession.findMany({
        where: whereClause,
        orderBy: [{ isPinned: 'desc' }, { pinnedAt: 'desc' }, { archivedAt: 'desc' }],
        take: limit,
        ...(cursor ? { skip: 1 } : {}),
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { messages: true, studyArtifacts: true },
          },
        },
      }),
      prisma.chatSession.count({ where: { userId, isArchived: true } }),
    ]);

    const nextCursor =
      sessions.length === limit
        ? (sessions[sessions.length - 1]!.archivedAt ?? sessions[sessions.length - 1]!.updatedAt).toISOString()
        : null;

    return {
      items: sessions,
      nextCursor,
      totalCount,
      hasMore: nextCursor !== null,
    };
  }

  async markSessionRead(sessionId: string, userId: string) {
    return prisma.chatSession.updateMany({
      where: { id: sessionId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  async listContinueLearningSessions(userId: string, limit = 3) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sessions = await prisma.chatSession.findMany({
      where: { userId, isArchived: false, updatedAt: { lt: oneDayAgo } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true, studyArtifacts: true },
        },
      },
    });

    return sessions;
  }

  async globalSearch(userId: string, query: string, limit = 10, offset = 0) {
    const likePattern = `%${query}%`;

    const results = await prisma.$queryRaw<
      Array<{
        sessionId: string;
        sessionTitle: string;
        messageId: string;
        preview: string;
        senderType: SenderType;
        createdAt: Date;
      }>
    >`
      SELECT DISTINCT ON (m."sessionId")
        m."sessionId",
        s.title AS "sessionTitle",
        m.id AS "messageId",
        LEFT(m.content, 120) AS preview,
        m."senderType",
        m."createdAt"
      FROM "Message" m
      JOIN "ChatSession" s ON m."sessionId" = s.id
      WHERE s."userId" = ${userId}
        AND s."isArchived" = false
        AND m."senderType" = 'user'
        AND m.content ILIKE ${likePattern}
      ORDER BY m."sessionId", m."createdAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return results.map((r) => ({
      sessionId: r.sessionId,
      sessionTitle: r.sessionTitle,
      messageId: r.messageId,
      preview: r.preview,
      senderType: r.senderType,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async searchSessions(userId: string, query: string) {
    const sessions = await prisma.chatSession.findMany({
      where: {
        userId,
        isArchived: false,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { contextSummary: { contains: query, mode: 'insensitive' } },
          {
            messages: {
              some: {
                content: { contains: query, mode: 'insensitive' },
                senderType: 'user',
              },
            },
          },
        ],
      },
      orderBy: [{ isPinned: 'desc' }, { pinnedAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true, studyArtifacts: true },
        },
      },
    });

    return sessions;
  }

  async createSession(input: { userId: string; title: string; providerPreference: ProviderKey; aiRuntimeMode?: string }) {
    return prisma.chatSession.create({
      data: {
        userId: input.userId,
        title: input.title,
        providerPreference: input.providerPreference,
        aiRuntimeMode: input.aiRuntimeMode ?? 'external_api',
      },
    });
  }

  async updateSession(input: {
    sessionId: string;
    userId: string;
    title?: string;
    providerPreference?: ProviderKey;
    aiRuntimeMode?: string;
    contextSummary?: string | null;
    isPinned?: boolean;
    isArchived?: boolean;
  }) {
    await this.assertSessionOwner(input.sessionId, input.userId);
    return prisma.chatSession.update({
      where: { id: input.sessionId },
      data: {
        title: input.title,
        providerPreference: input.providerPreference,
        aiRuntimeMode: input.aiRuntimeMode,
        contextSummary: input.contextSummary,
        ...(input.isPinned !== undefined && {
          isPinned: input.isPinned,
          pinnedAt: input.isPinned ? new Date() : null,
        }),
        ...(input.isArchived !== undefined && {
          isArchived: input.isArchived,
          archivedAt: input.isArchived ? new Date() : null,
        }),
      },
    });
  }

  async deleteSession(sessionId: string, userId: string) {
    await this.assertSessionOwner(sessionId, userId);
    return prisma.chatSession.delete({
      where: { id: sessionId },
    });
  }

  async batchArchiveSessions(sessionIds: string[], userId: string) {
    await prisma.chatSession.updateMany({
      where: {
        id: { in: sessionIds },
        userId,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  async batchDeleteSessions(sessionIds: string[], userId: string) {
    await prisma.chatSession.deleteMany({
      where: {
        id: { in: sessionIds },
        userId,
      },
    });
  }

  async findSessionById(sessionId: string, userId: string) {
    return prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
  }

  async getMessages(sessionId: string, userId: string) {
    await this.assertSessionOwner(sessionId, userId);

    return prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getContextMessages(sessionId: string, limit: number) {
    const messages = await prisma.message.findMany({
      where: {
        sessionId,
        status: 'sent',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  async findMessageByClientMessageId(clientMessageId: string) {
    return prisma.message.findUnique({
      where: { clientMessageId },
    });
  }

  async findMessageById(messageId: string, userId: string) {
    return prisma.message.findFirst({
      where: {
        id: messageId,
        session: {
          userId,
        },
      },
    });
  }

  async createMessage(input: {
    sessionId: string;
    clientMessageId: string;
    parentClientMessageId?: string;
    senderType: SenderType;
    content: string;
    status: MessageStatus;
    provider?: ProviderKey;
    model?: string;
    providerRequestId?: string;
    responseFinishReason?: AIFinishReason;
    latencyMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    confidenceScore?: number | null;
    subjectLabel?: string | null;
    topicLabel?: string | null;
    levelLabel?: 'beginner' | 'intermediate' | 'advanced' | null;
    fallbackUsed?: boolean;
    retrievalSnapshot?: Prisma.InputJsonValue;
    errorCode?: string | null;
  }) {
    return prisma.message.create({
      data: input,
    });
  }

  async updateMessage(input: {
    clientMessageId: string;
    content?: string;
    status?: MessageStatus;
    provider?: ProviderKey | null;
    model?: string | null;
    providerRequestId?: string | null;
    responseFinishReason?: AIFinishReason | null;
    latencyMs?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
    confidenceScore?: number | null;
    subjectLabel?: string | null;
    topicLabel?: string | null;
    levelLabel?: 'beginner' | 'intermediate' | 'advanced' | null;
    fallbackUsed?: boolean;
    retrievalSnapshot?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null;
    errorCode?: string | null;
  }) {
    return prisma.message.update({
      where: { clientMessageId: input.clientMessageId },
      data: {
        content: input.content,
        status: input.status,
        provider: input.provider,
        model: input.model,
        providerRequestId: input.providerRequestId,
        responseFinishReason: input.responseFinishReason,
        latencyMs: input.latencyMs,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        totalTokens: input.totalTokens,
        confidenceScore: input.confidenceScore,
        subjectLabel: input.subjectLabel,
        topicLabel: input.topicLabel,
        levelLabel: input.levelLabel,
        fallbackUsed: input.fallbackUsed,
        retrievalSnapshot: input.retrievalSnapshot ?? undefined,
        errorCode: input.errorCode,
      },
    });
  }

  async assertSessionOwner(sessionId: string, userId: string) {
    const session = await this.findSessionById(sessionId, userId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }
    return session;
  }

  async findMessagesSince(sessionId: string, userId: string, since?: Date) {
    await this.assertSessionOwner(sessionId, userId);

    return prisma.message.findMany({
      where: {
        sessionId,
        ...(since
          ? {
              updatedAt: {
                gt: since,
              },
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
