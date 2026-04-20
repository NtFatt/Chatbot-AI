import type { MaterialLevel, MaterialType } from '@prisma/client';

import { prisma } from '../../config/prisma';

export class MaterialsRepository {
  async search(input: {
    query?: string;
    subject?: string;
    topic?: string;
    level?: MaterialLevel;
    type?: MaterialType;
    limit: number;
  }) {
    return prisma.studyMaterial.findMany({
      where: {
        level: input.level,
        type: input.type,
        OR: input.query
          ? [
              {
                title: {
                  contains: input.query,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: input.query,
                  mode: 'insensitive',
                },
              },
              {
                tags: {
                  hasSome: input.query.split(/\s+/),
                },
              },
            ]
          : undefined,
        subject: input.subject
          ? {
              OR: [
                {
                  slug: {
                    contains: input.subject,
                    mode: 'insensitive',
                  },
                },
                {
                  nameEn: {
                    contains: input.subject,
                    mode: 'insensitive',
                  },
                },
                {
                  nameVi: {
                    contains: input.subject,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : undefined,
        topic: input.topic
          ? {
              OR: [
                {
                  slug: {
                    contains: input.topic,
                    mode: 'insensitive',
                  },
                },
                {
                  nameEn: {
                    contains: input.topic,
                    mode: 'insensitive',
                  },
                },
                {
                  nameVi: {
                    contains: input.topic,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : undefined,
      },
      include: {
        subject: true,
        topic: true,
      },
      take: input.limit,
      orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createRecommendationHistory(
    sessionId: string,
    items: Array<{
      materialId: string;
      score: number;
      reason: string[];
    }>,
  ) {
    if (items.length === 0) {
      return;
    }

    await prisma.recommendationHistory.createMany({
      data: items.map((item) => ({
        sessionId,
        materialId: item.materialId,
        score: item.score,
        reason: item.reason,
      })),
    });
  }

  async listRecentSessionMessages(sessionId: string) {
    return prisma.message.findMany({
      where: {
        sessionId,
        status: 'sent',
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 12,
    });
  }
}
