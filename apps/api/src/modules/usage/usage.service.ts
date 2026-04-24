import { Prisma } from '@prisma/client';
import type { ProviderKey } from '@chatbot-ai/shared';

import { prisma } from '../../config/prisma';

const MODEL_COST_PER_1K_TOKENS: Partial<Record<ProviderKey, number>> = {
  GEMINI: 0.00035,
  OPENAI: 0.0012,
};

const estimateCost = (provider: ProviderKey, totalTokens?: number | null) => {
  if (!totalTokens) {
    return null;
  }

  const rate = MODEL_COST_PER_1K_TOKENS[provider];
  if (!rate) {
    return null;
  }

  return new Prisma.Decimal((totalTokens / 1000) * rate);
};

export class UsageService {
  async recordUsage(input: {
    userId: string;
    sessionId: string;
    messageId?: string | null;
    provider: ProviderKey;
    model: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
    latencyMs: number;
    success: boolean;
    fallbackUsed: boolean;
  }) {
    await prisma.aiUsageLog.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId,
        messageId: input.messageId ?? undefined,
        provider: input.provider,
        model: input.model,
        inputTokens: input.inputTokens ?? undefined,
        outputTokens: input.outputTokens ?? undefined,
        totalTokens: input.totalTokens ?? undefined,
        latencyMs: input.latencyMs,
        success: input.success,
        fallbackUsed: input.fallbackUsed,
        estimatedCost: estimateCost(input.provider, input.totalTokens),
      },
    });
  }

  async recordIncident(input: {
    provider: ProviderKey;
    model: string;
    errorCode: string;
    errorMessage: string;
    retryable: boolean;
    requestId?: string;
  }) {
    await prisma.providerIncident.create({
      data: input,
    });
  }

  async getProviderMetrics() {
    const logs = await prisma.aiUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const grouped = new Map<ProviderKey, typeof logs>();
    logs.forEach((log: (typeof logs)[number]) => {
      grouped.set(log.provider, [...(grouped.get(log.provider) ?? []), log]);
    });

    return Array.from(grouped.entries()).map(([provider, items]) => {
      const totalRequests = items.length;
      const successCount = items.filter((item: (typeof items)[number]) => item.success).length;
      const fallbackCount = items.filter((item: (typeof items)[number]) => item.fallbackUsed).length;
      const avgLatencyMs =
        totalRequests > 0
          ? Math.round(
              items.reduce((sum: number, item: (typeof items)[number]) => sum + item.latencyMs, 0) /
                totalRequests,
            )
          : 0;
      const totalTokens = items.reduce(
        (sum: number, item: (typeof items)[number]) => sum + (item.totalTokens ?? 0),
        0,
      );
      const estimatedCost = items.reduce(
        (sum: number, item: (typeof items)[number]) => sum + Number(item.estimatedCost ?? 0),
        0,
      );

      return {
        provider,
        totalRequests,
        successCount,
        failureCount: totalRequests - successCount,
        fallbackCount,
        avgLatencyMs,
        totalTokens,
        estimatedCost,
        lastSeenAt: items[0]?.createdAt.toISOString() ?? null,
      };
    });
  }

  async listProviderIncidents(limit = 50) {
    return prisma.providerIncident.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getChatUsage(input: { userId: string; sessionId?: string }) {
    const logs = await prisma.aiUsageLog.findMany({
      where: {
        userId: input.userId,
        sessionId: input.sessionId,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const totals = logs.reduce(
      (acc, log: (typeof logs)[number]) => {
        acc.requests += 1;
        acc.tokens += log.totalTokens ?? 0;
        acc.fallbacks += log.fallbackUsed ? 1 : 0;
        acc.cost += Number(log.estimatedCost ?? 0);
        return acc;
      },
      {
        requests: 0,
        tokens: 0,
        fallbacks: 0,
        cost: 0,
      },
    );

    return {
      summary: totals,
      items: logs.map((log: (typeof logs)[number]) => ({
        id: log.id,
        provider: log.provider,
        model: log.model,
        success: log.success,
        fallbackUsed: log.fallbackUsed,
        latencyMs: log.latencyMs,
        totalTokens: log.totalTokens,
        estimatedCost: Number(log.estimatedCost ?? 0),
        createdAt: log.createdAt.toISOString(),
        sessionId: log.sessionId,
        messageId: log.messageId,
      })),
    };
  }
}
