import { describe, expect, it, vi } from 'vitest';

import { InsightsService } from '../src/modules/insights/insights.service';

describe('InsightsService', () => {
  it('aggregates learning insights from existing session, artifact, and message data', async () => {
    const service = new InsightsService({
      chatSession: {
        count: vi
          .fn()
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(3),
        findFirst: vi.fn().mockResolvedValue({
          updatedAt: new Date('2026-04-29T08:00:00.000Z'),
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'session-2',
            title: 'JavaScript Closures',
            userId: 'user-1',
            providerPreference: 'OPENAI',
            contextSummary: 'Closures and scope chain',
            isPinned: true,
            pinnedAt: new Date('2026-04-29T09:00:00.000Z'),
            isArchived: false,
            archivedAt: null,
            createdAt: new Date('2026-04-27T08:00:00.000Z'),
            updatedAt: new Date('2026-04-29T09:00:00.000Z'),
            lastReadAt: new Date('2026-04-28T09:00:00.000Z'),
            messages: [{ content: 'Review closures and lexical scope.' }],
            _count: {
              messages: 8,
              studyArtifacts: 2,
            },
          },
          {
            id: 'session-1',
            title: 'SQL Revision',
            userId: 'user-1',
            providerPreference: 'GEMINI',
            contextSummary: 'Joins and indexing',
            isPinned: false,
            pinnedAt: null,
            isArchived: false,
            archivedAt: null,
            createdAt: new Date('2026-04-26T08:00:00.000Z'),
            updatedAt: new Date('2026-04-28T10:00:00.000Z'),
            lastReadAt: null,
            messages: [{ content: 'Practice left joins.' }],
            _count: {
              messages: 5,
              studyArtifacts: 4,
            },
          },
        ]),
      },
      studyArtifact: {
        count: vi
          .fn()
          .mockResolvedValueOnce(11)
          .mockResolvedValueOnce(4),
        groupBy: vi.fn().mockResolvedValue([
          { type: 'summary', _count: { _all: 5 } },
          { type: 'flashcard_set', _count: { _all: 3 } },
          { type: 'quiz_set', _count: { _all: 2 } },
          { type: 'note', _count: { _all: 1 } },
        ]),
      },
      message: {
        findMany: vi.fn().mockResolvedValue([
          { subjectLabel: 'SQL', topicLabel: 'JOIN', levelLabel: 'beginner' },
          { subjectLabel: 'SQL', topicLabel: 'JOIN', levelLabel: 'beginner' },
          { subjectLabel: 'SQL', topicLabel: 'Indexes', levelLabel: 'intermediate' },
          { subjectLabel: 'JavaScript', topicLabel: 'Closures', levelLabel: 'intermediate' },
          { subjectLabel: null, topicLabel: null, levelLabel: null },
        ]),
      },
    } as never);

    const insights = await service.getLearningInsights('user-1');

    expect(insights.summary.totalSessions).toBe(5);
    expect(insights.summary.totalArtifacts).toBe(11);
    expect(insights.summary.favoriteArtifacts).toBe(4);
    expect(insights.summary.activeSessionsLast7Days).toBe(3);
    expect(insights.artifactBreakdown[0]).toEqual({ type: 'summary', count: 5 });
    expect(insights.topSubjects[0]).toEqual({ label: 'SQL', count: 3 });
    expect(insights.topTopics[0]).toEqual({ label: 'JOIN', count: 2 });
    expect(insights.topLevels[0]).toEqual({ level: 'beginner', count: 2 });
    expect(insights.recentSessions[0]?.title).toBe('JavaScript Closures');
    expect(insights.recentSessions[0]?.isUnread).toBe(true);
  });

  it('returns stable empty insights when the user has no study history yet', async () => {
    const service = new InsightsService({
      chatSession: {
        count: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      studyArtifact: {
        count: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      message: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as never);

    const insights = await service.getLearningInsights('user-1');

    expect(insights.summary.lastActivityAt).toBeNull();
    expect(insights.artifactBreakdown).toEqual([]);
    expect(insights.topSubjects).toEqual([]);
    expect(insights.recentSessions).toEqual([]);
  });
});
