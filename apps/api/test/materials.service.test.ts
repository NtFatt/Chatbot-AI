import { describe, expect, it } from 'vitest';

import { MaterialsService } from '../src/modules/materials/materials.service';

describe('materials recommendation scoring', () => {
  it('boosts resources that match subject, topic, and recent chat keywords', async () => {
    const materialsRepository = {
      search: async () => [
        {
          id: 'sql-joins',
          title: 'SQL Query Patterns for Coursework',
          description: 'Covers joins, grouping, subqueries, and common pitfalls.',
          url: 'https://example.edu/sql',
          type: 'article',
          level: 'beginner',
          language: 'en',
          source: 'Campus Dev Notes',
          tags: ['sql', 'joins', 'group-by'],
          isFeatured: true,
          subject: {
            id: 'subject-db',
            slug: 'database-systems',
            nameVi: 'He quan tri co so du lieu',
            nameEn: 'Database Systems',
          },
          topic: {
            id: 'topic-sql',
            slug: 'sql-normalization',
            nameVi: 'SQL va chuan hoa',
            nameEn: 'SQL and Normalization',
            subjectId: 'subject-db',
          },
        },
        {
          id: 'calculus-intro',
          title: 'Derivative Intuition for First-Year Students',
          description: 'Rate of change and tangent lines.',
          url: 'https://example.edu/calculus',
          type: 'video',
          level: 'beginner',
          language: 'en',
          source: 'Math Visual Academy',
          tags: ['derivative', 'limits'],
          isFeatured: false,
          subject: {
            id: 'subject-calculus',
            slug: 'calculus',
            nameVi: 'Giai tich',
            nameEn: 'Calculus',
          },
          topic: null,
        },
      ],
      createRecommendationHistory: async () => undefined,
      listRecentSessionMessages: async () => [
        {
          id: 'message-1',
          content: 'Please explain SQL joins and normalization',
        },
      ],
    };

    const chatRepository = {
      findSessionById: async () => ({
        id: 'session-1',
      }),
    };

    const service = new MaterialsService(materialsRepository as never, chatRepository as never);

    const recommendations = await service.recommend({
      userId: 'user-1',
      sessionId: 'session-1',
      q: 'sql joins',
      subject: 'database',
      topic: 'sql',
      limit: 3,
    });

    expect(recommendations[0]?.id).toBe('sql-joins');
    expect(recommendations[0]?.reason).toContain('Boosted by recent chat context');
  });
});
