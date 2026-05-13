import type { AiRuntimeMode, LearningInsightsResponse, MaterialLevel, ChatSessionSummary } from '@chatbot-ai/shared';
import { DEFAULT_AI_RUNTIME_MODE } from '@chatbot-ai/shared';
import type { PrismaClient, Prisma } from '@prisma/client';

import { prisma } from '../../config/prisma';

type DatabaseClient = Pick<PrismaClient, 'chatSession' | 'studyArtifact' | 'message'>;

type SessionSummaryRow = Prisma.ChatSessionGetPayload<{
  include: {
    messages: {
      orderBy: { createdAt: 'desc' };
      take: 1;
    };
    _count: {
      select: {
        messages: true;
        studyArtifacts: true;
      };
    };
  };
}>;

const toIso = (value: Date) => value.toISOString();

const mapSessionSummary = (session: SessionSummaryRow): ChatSessionSummary => ({
  id: session.id,
  title: session.title,
  providerPreference: session.providerPreference,
  aiRuntimeMode: (session.aiRuntimeMode ?? DEFAULT_AI_RUNTIME_MODE) as AiRuntimeMode,
  contextSummary: session.contextSummary,
  isPinned: session.isPinned,
  pinnedAt: session.pinnedAt ? toIso(session.pinnedAt) : null,
  isArchived: session.isArchived,
  archivedAt: session.archivedAt ? toIso(session.archivedAt) : null,
  createdAt: toIso(session.createdAt),
  updatedAt: toIso(session.updatedAt),
  lastMessagePreview: session.messages[0]?.content ?? null,
  messageCount: session._count.messages,
  artifactCount: session._count.studyArtifacts,
  isUnread:
    session.lastReadAt != null
      ? session.updatedAt > session.lastReadAt
      : session._count.messages > 0,
});

const takeTopCounts = (values: Array<string | null>, limit: number) =>
  [...values.reduce((counts, value) => {
    const label = value?.trim();
    if (!label) {
      return counts;
    }

    counts.set(label, (counts.get(label) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()).entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));

const takeTopLevels = (values: Array<MaterialLevel | null>, limit: number) =>
  [...values.reduce((counts, value) => {
    if (!value) {
      return counts;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map<MaterialLevel, number>()).entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([level, count]) => ({ level, count }));

export class InsightsService {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async getLearningInsights(userId: string): Promise<LearningInsightsResponse> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalSessions,
      activeSessionsLast7Days,
      totalArtifacts,
      favoriteArtifacts,
      lastActivitySession,
      artifactBreakdownRows,
      metadataRows,
      recentSessions,
    ] = await Promise.all([
      this.db.chatSession.count({
        where: { userId },
      }),
      this.db.chatSession.count({
        where: {
          userId,
          isArchived: false,
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      this.db.studyArtifact.count({
        where: { userId },
      }),
      this.db.studyArtifact.count({
        where: {
          userId,
          isFavorited: true,
        },
      }),
      this.db.chatSession.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.db.studyArtifact.groupBy({
        by: ['type'],
        where: { userId },
        _count: { _all: true },
      }),
      this.db.message.findMany({
        where: {
          senderType: 'assistant',
          session: { userId },
          OR: [
            { subjectLabel: { not: null } },
            { topicLabel: { not: null } },
            { levelLabel: { not: null } },
          ],
        },
        select: {
          subjectLabel: true,
          topicLabel: true,
          levelLabel: true,
        },
      }),
      this.db.chatSession.findMany({
        where: {
          userId,
          isArchived: false,
        },
        orderBy: [{ isPinned: 'desc' }, { pinnedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 4,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: true,
              studyArtifacts: true,
            },
          },
        },
      }),
    ]);

    return {
      summary: {
        totalSessions,
        activeSessionsLast7Days,
        totalArtifacts,
        favoriteArtifacts,
        lastActivityAt: lastActivitySession?.updatedAt ? toIso(lastActivitySession.updatedAt) : null,
      },
      artifactBreakdown: artifactBreakdownRows
        .map((row) => ({
          type: row.type,
          count: row._count._all,
        }))
        .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type)),
      topSubjects: takeTopCounts(metadataRows.map((row) => row.subjectLabel), 5),
      topTopics: takeTopCounts(metadataRows.map((row) => row.topicLabel), 5),
      topLevels: takeTopLevels(metadataRows.map((row) => row.levelLabel), 3),
      recentSessions: recentSessions.map(mapSessionSummary),
    };
  }
}
