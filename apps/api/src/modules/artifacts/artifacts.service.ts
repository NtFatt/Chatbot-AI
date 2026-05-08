import {
  artifactContentSchemasByType,
  buildArtifactSystemPrompt,
  buildArtifactUserPrompt,
  buildStructuredArtifactSystemPrompt,
  buildStructuredArtifactUserPrompt,
  structuredArtifactJsonSchemasByType,
  structuredArtifactSchemasByType,
  type ArtifactContent,
  type ArtifactExportPayload,
  type ArtifactGenerateType,
  type ArtifactSearchResult,
  type ArtifactSharePayload,
  type ArtifactShareRevokePayload,
  type PublicStudyArtifact,
  type StudyArtifact,
} from '@chatbot-ai/shared';
import { Prisma, type ArtifactType } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

import { logger } from '../../config/logger';
import { StructuredOutputService } from '../../integrations/ai/structured-output.service';
import { AppError } from '../../utils/errors';
import type { ProvidersService } from '../providers/providers.service';
import type { AuthService } from '../auth/auth.service';
import type { ChatRepository } from '../chat/chat.repository';
import { ArtifactsRepository } from './artifacts.repository';
import { buildArtifactMarkdown } from './artifact-markdown';
import { buildLocalArtifactFallback } from './local-artifact-fallback';

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

const PREVIEW_MAX_LENGTH = 100;
type StructuredArtifactEnvelope = {
  content: ArtifactContent;
  qualityScore: number | null;
};

type ArtifactGenerationPath =
  | 'structured'
  | 'legacy_rescue'
  | 'local_provider_fallback'
  | 'local_degraded_source';

type ArtifactGenerationResult = StructuredArtifactEnvelope & {
  path: ArtifactGenerationPath;
  provider?: string;
  model?: string;
  providerFallbackUsed?: boolean;
  sourceDegraded?: boolean;
  sourceReason?: string | null;
};

type ResolvedSourceContent = {
  content: string;
  title: string;
  sourceDegraded: boolean;
  sourceReason: string | null;
};

type ArtifactRecordWithOptionalSession = {
  id: string;
  userId: string;
  sessionId: string | null;
  session?: { title: string } | null;
  messageId: string | null;
  type: ArtifactType;
  title: string;
  content: unknown;
  isFavorited: boolean;
  shareToken?: string | null;
  qualityScore: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function extractSearchPreview(content: unknown, type: ArtifactType): string {
  if (!content || typeof content !== 'object') return '';
  const c = content as Record<string, unknown>;

  switch (type) {
    case 'summary': {
      const bullets = c.bullets;
      if (Array.isArray(bullets) && bullets.length > 0) {
        const first = String(bullets[0]);
        return first.length > PREVIEW_MAX_LENGTH
          ? first.slice(0, PREVIEW_MAX_LENGTH) + '…'
          : first;
      }
      break;
    }
    case 'flashcard_set': {
      if (Array.isArray(c)) {
        const first = c[0] as Record<string, unknown> | undefined;
        const front = first && String(first['front'] ?? '');
        if (front) {
          return front.length > PREVIEW_MAX_LENGTH
            ? front.slice(0, PREVIEW_MAX_LENGTH) + '…'
            : front;
        }
      }
      break;
    }
    case 'quiz_set': {
      if (Array.isArray(c)) {
        const first = c[0] as Record<string, unknown> | undefined;
        const question = first && String(first['question'] ?? '');
        if (question) {
          return question.length > PREVIEW_MAX_LENGTH
            ? question.slice(0, PREVIEW_MAX_LENGTH) + '…'
            : question;
        }
      }
      break;
    }
    case 'note': {
      const body = c.body;
      if (typeof body === 'string' && body) {
        return body.length > PREVIEW_MAX_LENGTH
          ? body.slice(0, PREVIEW_MAX_LENGTH) + '…'
          : body;
      }
      break;
    }
  }
  return '';
}

export class ArtifactsService {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly providersService: ProvidersService,
    private readonly structuredOutputService: StructuredOutputService,
    private readonly authService: AuthService,
    private readonly chatRepository: ChatRepository,
  ) {}

  private mapArtifact(
    artifact: ArtifactRecordWithOptionalSession,
  ): StudyArtifact {
    return {
      id: artifact.id,
      userId: artifact.userId,
      sessionId: artifact.sessionId ?? null,
      sessionTitle: artifact.session?.title ?? null,
      messageId: artifact.messageId ?? null,
      type: artifact.type,
      title: artifact.title,
      content: artifact.content as unknown as ArtifactContent,
      isFavorited: artifact.isFavorited,
      isShared: Boolean(artifact.shareToken),
      qualityScore: artifact.qualityScore ?? null,
      createdAt: toIso(artifact.createdAt),
      updatedAt: toIso(artifact.updatedAt),
    };
  }

  private mapPublicArtifact(artifact: {
    id: string;
    type: ArtifactType;
    title: string;
    content: unknown;
    qualityScore: number | null;
    createdAt: Date;
  }): PublicStudyArtifact {
    return {
      id: artifact.id,
      type: artifact.type,
      title: artifact.title,
      content: artifact.content as ArtifactContent,
      qualityScore: artifact.qualityScore ?? null,
      createdAt: toIso(artifact.createdAt),
    };
  }

  private buildShareToken() {
    return randomBytes(24).toString('base64url');
  }

  private async attachShareToken(artifactId: string, userId: string) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const shareToken = this.buildShareToken();

      try {
        return await this.artifactsRepository.setShareToken(artifactId, userId, shareToken);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new AppError(500, 'ARTIFACT_SHARE_TOKEN_FAILED', 'Không thể tạo liên kết chia sẻ lúc này.');
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
  ): Promise<ResolvedSourceContent> {
    if (messageId) {
      const message = await this.chatRepository.findMessageById(messageId, userId);
      if (message && (!sessionId || message.sessionId === sessionId)) {
        const title = message.content.slice(0, 60).replace(/\n/g, ' ').trim() || 'Untitled';
        const sourceDegraded =
          message.senderType === 'assistant' &&
          (message.fallbackUsed || message.errorCode !== null || message.responseFinishReason === 'error');
        const sourceReason = sourceDegraded
          ? message.fallbackUsed
            ? 'assistant_message_used_fallback'
            : message.errorCode
              ? `assistant_message_error:${message.errorCode}`
              : 'assistant_message_finish_reason_error'
          : null;
        return { content: message.content, title, sourceDegraded, sourceReason };
      }
    }
    return {
      content: sourceContent,
      title: sourceContent.slice(0, 60).replace(/\n/g, ' ').trim() || 'Untitled',
      sourceDegraded: false,
      sourceReason: null,
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
    const { content, title, sourceDegraded, sourceReason } = await this.resolveSourceContent(
      input.sessionId,
      input.messageId,
      input.sourceContent,
      userId,
    );

    if (content.length < 50) {
      throw new AppError(400, 'CONTENT_TOO_SHORT', 'Nội dung quá ngắn để tạo artifact.');
    }

    const language = await this.getUserLanguage(userId);
    const generatedArtifact: ArtifactGenerationResult = sourceDegraded
      ? (() => {
          logger.warn(
            {
              artifactType: input.type,
              sessionId: input.sessionId ?? null,
              messageId: input.messageId ?? null,
              sourceReason,
            },
            'Artifact requested from a degraded assistant response; using deterministic local artifact fallback without quality score',
          );

          return {
            ...buildLocalArtifactFallback(input.type, content),
            path: 'local_degraded_source' as const,
            sourceDegraded: true,
            sourceReason,
          } satisfies ArtifactGenerationResult;
        })()
      : await this.callArtifactAI({
          userId,
          sessionId: input.sessionId ?? null,
          messageId: input.messageId ?? null,
          type: input.type,
          content,
          language,
        });
    const artifactTitle = `${artifactTitlePrefixMap[input.type]}${title}`;

    const artifact = await this.artifactsRepository.create({
      userId,
      sessionId: input.sessionId,
      messageId: input.messageId,
      type: input.type,
      title: artifactTitle,
      content: generatedArtifact.content as object,
      qualityScore: generatedArtifact.qualityScore,
    });

    logger.info(
      {
        artifactId: artifact.id,
        artifactType: input.type,
        sessionId: input.sessionId ?? null,
        messageId: input.messageId ?? null,
        path: generatedArtifact.path,
        qualityScore: artifact.qualityScore ?? null,
        provider: generatedArtifact.provider,
        model: generatedArtifact.model,
        providerFallbackUsed: generatedArtifact.providerFallbackUsed ?? false,
        sourceDegraded: generatedArtifact.sourceDegraded ?? false,
        sourceReason: generatedArtifact.sourceReason ?? null,
      },
      'Artifact persisted',
    );

    return this.mapArtifact(artifact);
  }

  private parseLegacyArtifactContent(
    type: ArtifactGenerateType,
    rawText: string,
  ): StructuredArtifactEnvelope {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsedJson = JSON.parse(cleaned) as unknown;
    const parsedContent = artifactContentSchemasByType[type].safeParse(parsedJson);
    if (!parsedContent.success) {
      throw new Error(
        `LEGACY_ARTIFACT_PARSE_FAILED: ${parsedContent.error.issues[0]?.message ?? 'Unknown validation error'}`,
      );
    }

    return {
      content: parsedContent.data,
      qualityScore: null,
    };
  }

  private async callArtifactAI(input: {
    userId: string;
    sessionId: string | null;
    messageId: string | null;
    type: ArtifactGenerateType;
    content: string;
    language: string;
  }): Promise<ArtifactGenerationResult> {
    const providersState = await this.providersService.listProviders();
    const sessionProvider =
      input.sessionId
        ? (await this.chatRepository.findSessionById(input.sessionId, input.userId))?.providerPreference
        : null;

    try {
      const result = await this.structuredOutputService.generate({
        userId: input.userId,
        sessionId: input.sessionId,
        messageId: input.messageId,
        sessionProvider: sessionProvider ?? providersState.defaultProvider,
        schemaName: `artifact_${input.type}`,
        schemaDescription: `Structured study artifact payload for ${input.type}.`,
        schema: structuredArtifactSchemasByType[input.type] as z.ZodType<StructuredArtifactEnvelope>,
        jsonSchema: structuredArtifactJsonSchemasByType[input.type],
        systemPrompt: buildStructuredArtifactSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: buildStructuredArtifactUserPrompt(input.type, input.content, input.language),
          },
        ],
        legacyFallback: {
          systemPrompt: buildArtifactSystemPrompt(),
          messages: [
            {
              role: 'user',
              content: buildArtifactUserPrompt(input.type, input.content, input.language),
            },
          ],
          parse: (text) => this.parseLegacyArtifactContent(input.type, text),
        },
      });

      const generationPath = result.legacyFallbackUsed ? 'legacy_rescue' : 'structured';
      logger.info(
        {
          artifactType: input.type,
          sessionId: input.sessionId,
          messageId: input.messageId,
          path: generationPath,
          provider: result.provider,
          model: result.model,
          providerFallbackUsed: result.providerFallbackUsed,
          legacyFallbackUsed: result.legacyFallbackUsed,
          qualityScore: result.data.qualityScore,
        },
        result.legacyFallbackUsed
          ? 'Artifact generated via legacy rescue path'
          : 'Artifact generated via structured output',
      );

      return {
        ...result.data,
        path: generationPath,
        provider: result.provider,
        model: result.model,
        providerFallbackUsed: result.providerFallbackUsed,
      };
    } catch (error) {
      if (
        error instanceof AppError &&
        [
          'STRUCTURED_OUTPUT_AND_FALLBACK_FAILED',
          'STRUCTURED_OUTPUT_FAILED',
          'AI_PROVIDER_UNAVAILABLE',
          'AI_PROVIDER_COOLDOWN',
        ].includes(error.code)
      ) {
        logger.warn(
          {
            artifactType: input.type,
            sessionId: input.sessionId,
            messageId: input.messageId,
            code: error.code,
            details: error.details,
          },
          'Structured artifact generation unavailable, using deterministic local artifact fallback',
        );

        return {
          ...buildLocalArtifactFallback(input.type, input.content),
          path: 'local_provider_fallback',
        };
      }

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

  async exportMarkdown(userId: string, artifactId: string): Promise<ArtifactExportPayload> {
    const artifact = await this.artifactsRepository.findById(artifactId, userId);
    if (!artifact) {
      throw new AppError(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found.');
    }

    const { markdown, filename } = buildArtifactMarkdown({
      title: artifact.title,
      type: artifact.type,
      createdAt: artifact.createdAt,
      content: artifact.content as unknown as ArtifactContent,
    });

    logger.info(
      {
        artifactId,
        userId,
        artifactType: artifact.type,
      },
      'Artifact exported to markdown',
    );

    return {
      artifactId: artifact.id,
      filename,
      mimeType: 'text/markdown',
      markdown,
    };
  }

  async createShareLink(userId: string, artifactId: string): Promise<ArtifactSharePayload> {
    const artifact = await this.artifactsRepository.findById(artifactId, userId);
    if (!artifact) {
      throw new AppError(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found.');
    }

    const sharedArtifact = artifact.shareToken
      ? artifact
      : await this.attachShareToken(artifactId, userId);

    logger.info(
      {
        artifactId,
        userId,
        alreadyShared: Boolean(artifact.shareToken),
      },
      artifact.shareToken ? 'Artifact share link reused' : 'Artifact share link created',
    );

    return {
      artifactId: sharedArtifact.id,
      isShared: true,
      shareToken: sharedArtifact.shareToken!,
    };
  }

  async revokeShareLink(userId: string, artifactId: string): Promise<ArtifactShareRevokePayload> {
    const artifact = await this.artifactsRepository.findById(artifactId, userId);
    if (!artifact) {
      throw new AppError(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found.');
    }

    if (artifact.shareToken) {
      await this.artifactsRepository.clearShareToken(artifactId, userId);
      logger.info({ artifactId, userId }, 'Artifact share link revoked');
    } else {
      logger.info({ artifactId, userId }, 'Artifact share revoke requested for already unshared artifact');
    }

    return {
      artifactId,
      isShared: false,
    };
  }

  async getPublicArtifactByToken(shareToken: string): Promise<PublicStudyArtifact> {
    const artifact = await this.artifactsRepository.findByShareToken(shareToken);
    if (!artifact) {
      throw new AppError(404, 'ARTIFACT_SHARE_NOT_FOUND', 'Shared artifact not found.');
    }

    return this.mapPublicArtifact(artifact);
  }

  async delete(userId: string, artifactId: string) {
    const artifact = await this.artifactsRepository.findById(artifactId, userId);
    if (!artifact) {
      throw new AppError(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found.');
    }
    await this.artifactsRepository.delete(artifactId, userId);
  }

  async searchArtifacts(
    userId: string,
    params: { q: string; limit: number; type?: ArtifactGenerateType },
  ): Promise<ArtifactSearchResult[]> {
    const rows = await this.artifactsRepository.searchByUser(
      userId,
      params.q,
      params.limit,
      params.type as ArtifactType | undefined,
    );
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      sessionId: row.sessionId,
      sessionTitle: row.session?.title ?? null,
      preview: extractSearchPreview(row.content, row.type),
      isFavorited: row.isFavorited,
      createdAt: toIso(row.createdAt),
    }));
  }

  async listFavorites(userId: string): Promise<StudyArtifact[]> {
    const artifacts = await this.artifactsRepository.listFavorites(userId);
    return artifacts.map((a) => this.mapArtifact(a));
  }

  async toggleFavorite(userId: string, artifactId: string): Promise<StudyArtifact> {
    const artifact = await this.artifactsRepository.findById(artifactId, userId);
    if (!artifact) {
      throw new AppError(404, 'ARTIFACT_NOT_FOUND', 'Artifact not found.');
    }
    const updated = await this.artifactsRepository.setFavorite(artifactId, userId, !artifact.isFavorited);
    return this.mapArtifact(updated);
  }
}
