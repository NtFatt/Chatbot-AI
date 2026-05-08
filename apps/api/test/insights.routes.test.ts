import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createInsightsController } from '../src/modules/insights/insights.controller';
import type { InsightsService } from '../src/modules/insights/insights.service';

const buildApp = (service: InsightsService) => {
  const app = express();
  app.use((req, _res, next) => {
    req.auth = { userId: 'user-1', sessionId: 'sess-1' };
    req.requestId = 'test-request-id';
    next();
  });
  const controller = createInsightsController(service);
  app.get('/api/insights/learning', controller.learning);
  return app;
};

describe('InsightsController', () => {
  it('returns learning insights in the standard success envelope', async () => {
    const service = {
      getLearningInsights: vi.fn().mockResolvedValue({
        summary: {
          totalSessions: 4,
          activeSessionsLast7Days: 2,
          totalArtifacts: 9,
          favoriteArtifacts: 3,
          lastActivityAt: '2026-04-29T08:00:00.000Z',
        },
        artifactBreakdown: [{ type: 'summary', count: 5 }],
        topSubjects: [{ label: 'SQL', count: 4 }],
        topTopics: [{ label: 'JOIN', count: 3 }],
        topLevels: [{ level: 'beginner', count: 2 }],
        recentSessions: [],
      }),
    } as unknown as InsightsService;

    const response = await request(buildApp(service)).get('/api/insights/learning');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.summary.totalSessions).toBe(4);
    expect(service.getLearningInsights).toHaveBeenCalledWith('user-1');
  });

  it('returns empty-state insights cleanly', async () => {
    const service = {
      getLearningInsights: vi.fn().mockResolvedValue({
        summary: {
          totalSessions: 0,
          activeSessionsLast7Days: 0,
          totalArtifacts: 0,
          favoriteArtifacts: 0,
          lastActivityAt: null,
        },
        artifactBreakdown: [],
        topSubjects: [],
        topTopics: [],
        topLevels: [],
        recentSessions: [],
      }),
    } as unknown as InsightsService;

    const response = await request(buildApp(service)).get('/api/insights/learning');

    expect(response.status).toBe(200);
    expect(response.body.data.summary.totalArtifacts).toBe(0);
    expect(response.body.data.topTopics).toHaveLength(0);
  });
});
