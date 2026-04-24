import type { MaterialRecommendation, MaterialSearchParams } from '@chatbot-ai/shared';

import { AppError } from '../../utils/errors';
import { extractKeywords } from '../../utils/text';
import { ChatRepository } from '../chat/chat.repository';
import { MaterialsRepository } from './materials.repository';

const mapMaterial = (
  material: Awaited<ReturnType<MaterialsRepository['search']>>[number],
  score: number,
  reason: string[],
): MaterialRecommendation => ({
  id: material.id,
  title: material.title,
  description: material.description,
  url: material.url,
  subject: {
    id: material.subject.id,
    slug: material.subject.slug,
    nameVi: material.subject.nameVi,
    nameEn: material.subject.nameEn,
  },
  topic: material.topic
    ? {
        id: material.topic.id,
        slug: material.topic.slug,
        nameVi: material.topic.nameVi,
        nameEn: material.topic.nameEn,
        subjectId: material.topic.subjectId,
      }
    : null,
  level: material.level,
  type: material.type,
  tags: material.tags,
  language: material.language,
  source: material.source,
  score,
  reason,
  isFeatured: material.isFeatured,
});

export class MaterialsService {
  constructor(
    private readonly materialsRepository: MaterialsRepository,
    private readonly chatRepository: ChatRepository,
  ) {}

  async search(params: MaterialSearchParams) {
    const materials = await this.materialsRepository.search({
      query: params.q,
      subject: params.subject,
      topic: params.topic,
      level: params.level,
      type: params.type,
      limit: params.limit ?? 8,
    });

    return materials.map((material) =>
      mapMaterial(material, material.isFeatured ? 10 : 5, ['Search match']),
    );
  }

  private async rankRecommendations(
    params: MaterialSearchParams & { sessionId?: string; userId: string },
  ) {
    const keywordsFromQuery = extractKeywords([params.q, params.subject, params.topic].filter(Boolean).join(' '));

    const session = params.sessionId
      ? await this.chatRepository.findSessionById(params.sessionId, params.userId)
      : null;

    if (params.sessionId && !session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Chat session not found.');
    }

    const recentMessages = session
      ? await this.materialsRepository.listRecentSessionMessages(session.id)
      : [];
    const historyKeywords = extractKeywords(recentMessages.map((message) => message.content).join(' '));

    const materials = await this.materialsRepository.search({
      query: params.q,
      subject: params.subject,
      topic: params.topic,
      level: params.level,
      type: params.type,
      limit: 24,
    });

    const ranked = materials
      .map((material) => {
        let score = material.isFeatured ? 15 : 0;
        const reason: string[] = [];

        const subjectBlob = `${material.subject.slug} ${material.subject.nameEn} ${material.subject.nameVi}`.toLowerCase();
        const topicBlob = `${material.topic?.slug ?? ''} ${material.topic?.nameEn ?? ''} ${material.topic?.nameVi ?? ''}`.toLowerCase();
        const textBlob = `${material.title} ${material.description} ${material.tags.join(' ')}`.toLowerCase();

        if (params.subject && subjectBlob.includes(params.subject.toLowerCase())) {
          score += 35;
          reason.push('Matches subject');
        }

        if (params.topic && topicBlob.includes(params.topic.toLowerCase())) {
          score += 30;
          reason.push('Matches topic');
        }

        if (params.level && material.level === params.level) {
          score += 15;
          reason.push('Matches level');
        }

        if (params.type && material.type === params.type) {
          score += 10;
          reason.push('Matches material type');
        }

        const keywordHits = keywordsFromQuery.filter((keyword) => textBlob.includes(keyword)).length;
        if (keywordHits > 0) {
          score += keywordHits * 8;
          reason.push('Matches query keywords');
        }

        const historyHits = historyKeywords.filter((keyword) => textBlob.includes(keyword)).length;
        if (historyHits > 0) {
          score += historyHits * 5;
          reason.push('Boosted by recent chat context');
        }

        return mapMaterial(material, score, reason.length > 0 ? reason : ['General relevance']);
      })
      .sort((left: MaterialRecommendation, right: MaterialRecommendation) => right.score - left.score)
      .slice(0, params.limit ?? 8);

    return {
      ranked,
      session,
    };
  }

  async recommend(
    params: MaterialSearchParams & { sessionId?: string; userId: string },
    options?: {
      persistHistory?: boolean;
    },
  ) {
    const { ranked, session } = await this.rankRecommendations(params);

    if ((options?.persistHistory ?? true) && session) {
      await this.materialsRepository.createRecommendationHistory(
        session.id,
        ranked.map((item: MaterialRecommendation) => ({
          materialId: item.id,
          score: item.score,
          reason: item.reason,
        })),
      );
    }

    return ranked;
  }
}
