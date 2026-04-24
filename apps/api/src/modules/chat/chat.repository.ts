import type { MessageStatus, ProviderKey, SenderType, AIFinishReason, Prisma } from '@prisma/client';

import { prisma } from '../../config/prisma';

export class ChatRepository {
  async listSessions(userId: string) {
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return sessions;
  }

  async createSession(input: { userId: string; title: string; providerPreference: ProviderKey }) {
    return prisma.chatSession.create({
      data: input,
    });
  }

  async updateSession(input: {
    sessionId: string;
    userId: string;
    title?: string;
    providerPreference?: ProviderKey;
    contextSummary?: string | null;
  }) {
    await this.assertSessionOwner(input.sessionId, input.userId);
    return prisma.chatSession.update({
      where: { id: input.sessionId },
      data: {
        title: input.title,
        providerPreference: input.providerPreference,
        contextSummary: input.contextSummary,
      },
    });
  }

  async deleteSession(sessionId: string, userId: string) {
    await this.assertSessionOwner(sessionId, userId);
    return prisma.chatSession.delete({
      where: { id: sessionId },
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
