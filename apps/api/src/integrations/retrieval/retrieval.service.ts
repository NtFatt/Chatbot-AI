import type { MaterialRecommendation } from '@chatbot-ai/shared';

import { extractKeywords, truncateText } from '../../utils/text';
import { ChatRepository } from '../../modules/chat/chat.repository';
import { MaterialsService } from '../../modules/materials/materials.service';
import type { RetrievalContext } from './retrieval.types';

const buildSnippet = (material: MaterialRecommendation) =>
  truncateText(
    [
      material.description,
      material.subject.nameVi,
      material.topic?.nameVi ?? material.topic?.nameEn ?? '',
      material.tags.join(', '),
    ]
      .filter(Boolean)
      .join(' | '),
    320,
  );

const normalizeLabel = (value?: string | null) => value?.trim() || null;

export class RetrievalService {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly chatRepository: ChatRepository,
  ) {}

  async retrieveForQuestion(input: {
    userId: string;
    sessionId: string;
    message: string;
    requestedSubject?: string | null;
    requestedTopic?: string | null;
  }): Promise<RetrievalContext> {
    const session = await this.chatRepository.findSessionById(input.sessionId, input.userId);
    const contextSeed = [input.message, session?.contextSummary ?? ''].filter(Boolean).join(' ');
    const queryExpansion = extractKeywords(contextSeed).slice(0, 8);
    const query = [input.message, ...queryExpansion.slice(0, 3)].join(' ').trim();

    const ranked = await this.materialsService.recommend(
      {
        userId: input.userId,
        sessionId: input.sessionId,
        q: query,
        subject: input.requestedSubject ?? undefined,
        topic: input.requestedTopic ?? undefined,
        limit: 5,
      },
      {
        persistHistory: false,
      },
    );

    const materials = ranked.map((material) => ({
      id: material.id,
      title: material.title,
      url: material.url,
      snippet: buildSnippet(material),
      score: material.score,
      reason: material.reason,
      subjectLabel: material.subject.nameVi || material.subject.nameEn,
      topicLabel: material.topic?.nameVi ?? material.topic?.nameEn ?? null,
      type: material.type,
      level: material.level,
    }));

    const inferredSubject =
      normalizeLabel(input.requestedSubject) ?? normalizeLabel(ranked[0]?.subject.nameVi) ?? normalizeLabel(ranked[0]?.subject.nameEn);
    const inferredTopic =
      normalizeLabel(input.requestedTopic) ?? normalizeLabel(ranked[0]?.topic?.nameVi) ?? normalizeLabel(ranked[0]?.topic?.nameEn);

    const promptContext =
      materials.length > 0
        ? [
            'Retrieved study materials:',
            ...materials.map(
              (material, index) =>
                `${index + 1}. ${material.title}\nURL: ${material.url}\nSnippet: ${material.snippet}\nReason: ${material.reason.join(', ')}`,
            ),
            queryExpansion.length > 0 ? `Suggested next keywords: ${queryExpansion.join(', ')}` : null,
          ]
            .filter(Boolean)
            .join('\n\n')
        : 'No study materials were retrieved for this turn.';

    return {
      inferredSubject,
      inferredTopic,
      queryExpansion,
      materials,
      promptContext,
    };
  }
}
