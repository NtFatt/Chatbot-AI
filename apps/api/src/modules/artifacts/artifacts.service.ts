import type { ArtifactContent, ArtifactGenerateType, StudyArtifact } from '@chatbot-ai/shared';
import type { ProviderKey } from '@prisma/client';

import { AppError } from '../../utils/errors';
import type { AIProvider } from '../../integrations/ai/ai.types';
import type { ProvidersService } from '../providers/providers.service';
import type { AuthService } from '../auth/auth.service';
import type { ChatRepository } from '../chat/chat.repository';
import { ArtifactsRepository } from './artifacts.repository';

const toIso = (value: Date) => value.toISOString();

const artifactTitleMap: Record<ArtifactGenerateType, string> = {
  summary: 'Summary',
  flashcard_set: 'Flashcards',
  quiz_set: 'Quiz',
  note: 'Note',
};

const artifactTitlePrefixMap: Record<ArtifactGenerateType, string> = {
  summary: 'Summary from: ',
  flashcard_set: 'Flashcards from: ',
  quiz_set: 'Quiz from: ',
  note: 'Note from: ',
};

export class ArtifactsService {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly providersService: ProvidersService,
    private readonly providers: Record<ProviderKey, AIProvider | null>,
    private readonly authService: AuthService,
    private readonly chatRepository: ChatRepository,
  ) {}

  private mapArtifact(
    artifact: Awaited<ReturnType<ArtifactsRepository['create']>>,
  ): StudyArtifact {
    return {
      id: artifact.id,
      userId: artifact.userId,
      sessionId: artifact.sessionId ?? null,
      messageId: artifact.messageId ?? null,
      type: artifact.type,
      title: artifact.title,
      content: artifact.content as unknown as ArtifactContent,
      createdAt: toIso(artifact.createdAt),
      updatedAt: toIso(artifact.updatedAt),
    };
  }

  private async getUserLanguage(userId: string): Promise<string> {
    try {
      const user = await this.authService.me(userId);
      return user.preferredLanguage ?? 'bilingual';
    } catch {
      return 'bilingual';
    }
  }

  private async resolveSourceContent(
    sessionId: string | undefined,
    messageId: string | undefined,
    sourceContent: string,
    userId: string,
  ): Promise<{ content: string; title: string }> {
    if (messageId) {
      const message = await this.chatRepository.findMessageByClientMessageId(messageId);
      if (message && message.sessionId === sessionId) {
        const title = message.content.slice(0, 60).replace(/\n/g, ' ').trim() || 'Untitled';
        return { content: message.content, title };
      }
    }
    return {
      content: sourceContent,
      title: sourceContent.slice(0, 60).replace(/\n/g, ' ').trim() || 'Untitled',
    };
  }

  async generate(
    userId: string,
    input: {
      sessionId?: string;
      messageId?: string;
      type: ArtifactGenerateType;
      sourceContent: string;
    },
  ): Promise<StudyArtifact> {
    const { content, title } = await this.resolveSourceContent(
      input.sessionId,
      input.messageId,
      input.sourceContent,
      userId,
    );

    if (content.length < 50) {
      throw new AppError(400, 'CONTENT_TOO_SHORT', 'Nội dung quá ngắn để tạo artifact.');
    }

    const language = await this.getUserLanguage(userId);
    const generatedContent = await this.callArtifactAI(input.type, content, language);
    const artifactTitle = `${artifactTitlePrefixMap[input.type]}${title}`;

    const artifact = await this.artifactsRepository.create({
      userId,
      sessionId: input.sessionId,
      messageId: input.messageId,
      type: input.type,
      title: artifactTitle,
      content: generatedContent as object,
    });

    return this.mapArtifact(artifact);
  }

  private async callArtifactAI(
    type: ArtifactGenerateType,
    content: string,
    language: string,
  ): Promise<unknown> {
    const { buildArtifactSystemPrompt, buildArtifactUserPrompt } = await import('@chatbot-ai/shared');

    const systemPrompt = buildArtifactSystemPrompt();
    const userPrompt = buildArtifactUserPrompt(type, content, language);

    const providersState = await this.providersService.listProviders();
    const primaryProvider = providersState.providers.find(
      (p) => p.enabled && p.configured && p.key === providersState.defaultProvider,
    );

    if (!primaryProvider) {
      throw new AppError(503, 'AI_PROVIDER_UNAVAILABLE', 'Không có AI provider khả dụng để tạo artifact.');
    }

    const provider = this.providers[primaryProvider.key];
    if (!provider) {
      throw new AppError(503, 'AI_PROVIDER_UNAVAILABLE', 'AI provider client chưa được khởi tạo.');
    }

    try {
      const response = await provider.generate(
        {
          provider: primaryProvider.key,
          model: primaryProvider.model,
          systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          timeoutMs: primaryProvider.timeoutMs,
        },
        {},
      );

      const cleaned = response.text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      if (!parsed || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
        throw new Error('Empty JSON response');
      }

      return parsed as unknown as ArtifactContent;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'ARTIFACT_GENERATION_FAILED', 'Không thể tạo artifact từ nội dung này.');
    }
  }

  async list(userId: string, params: {
    sessionId?: string;
    type?: ArtifactGenerateType;
    limit?: number;
  }) {
    const artifacts = await this.artifactsRepository.listByUser(userId, {
      sessionId: params.sessionId,
      type: params.type,
      limit: params.limit ?? 20,
    });
    return artifacts.map((a) => this.mapArtifact(a));
  }

  async listBySession(userId: string, sessionId: string) {
    const artifacts = await this.artifactsRepository.listBySession(sessionId, userId);
    return artifacts.map((a) => this.mapArtifact(a));
  }

  async delete(userId: string, artifactId: string) {
    const artifact = await this.artifactsRepository.findById(artifactId, userId);
    if (!artifact) {
      throw new AppError(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found.');
    }
    await this.artifactsRepository.delete(artifactId, userId);
  }
}
