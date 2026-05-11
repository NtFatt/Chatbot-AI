import type {
  AIFallbackInfo,
  ChatAskResponse,
  ChatMessage,
  ChatSessionSummary,
  ProviderKey,
  RetrievalSnapshot,
} from '@chatbot-ai/shared';
import type { Prisma } from '@prisma/client';

import { buildContextSummary, buildSessionTitle } from '../../utils/text';
import { AppError } from '../../utils/errors';
import type { AuthService } from '../auth/auth.service';
import { AIOrchestratorService } from '../../integrations/ai/ai-orchestrator.service';
import { RetrievalService } from '../../integrations/retrieval/retrieval.service';
import { ChatRepository } from './chat.repository';
import { ChatGuardService } from './chat-guard.service';
import { SessionIntelligenceService } from './session-intelligence.service';

const DEFAULT_SESSION_TITLE = 'Tro chuyen moi / New study chat';

const toIso = (value: Date) => value.toISOString();
const toJsonValue = (value: RetrievalSnapshot | null | undefined): Prisma.InputJsonValue | undefined =>
  value ? (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue) : undefined;

const mapSession = (
  session: Awaited<ReturnType<ChatRepository['listSessions']>>['items'][number],
): ChatSessionSummary => ({
  id: session.id,
  title: session.title,
  providerPreference: session.providerPreference,
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

const mapMessage = (
  message:
    | Awaited<ReturnType<ChatRepository['getMessages']>>[number]
    | Awaited<ReturnType<ChatRepository['createMessage']>>
    | Awaited<ReturnType<ChatRepository['updateMessage']>>,
): ChatMessage => {
  const retrievalSnapshot = (message.retrievalSnapshot as RetrievalSnapshot | null) ?? null;
  const fallbackInfo = (retrievalSnapshot?.fallbackInfo as AIFallbackInfo | null | undefined) ?? null;

  return ({
  id: message.id,
  sessionId: message.sessionId,
  clientMessageId: message.clientMessageId,
  parentClientMessageId: message.parentClientMessageId ?? null,
  senderType: message.senderType,
  content: message.content,
  status: message.status,
  provider: message.provider ?? null,
  model: message.model ?? null,
  providerRequestId: message.providerRequestId ?? null,
  responseFinishReason: message.responseFinishReason ?? null,
  latencyMs: message.latencyMs ?? null,
  inputTokens: message.inputTokens ?? null,
  outputTokens: message.outputTokens ?? null,
  totalTokens: message.totalTokens ?? null,
  confidenceScore: message.confidenceScore ?? null,
  confidenceLevel:
    message.confidenceScore == null
      ? null
      : message.confidenceScore >= 0.75
        ? 'high'
        : message.confidenceScore >= 0.5
          ? 'medium'
          : 'low',
  subjectLabel: message.subjectLabel ?? null,
  topicLabel: message.topicLabel ?? null,
  levelLabel: message.levelLabel ?? null,
  fallbackUsed: message.fallbackUsed,
  fallbackInfo,
  retrievalSnapshot,
  errorCode: message.errorCode ?? null,
  createdAt: toIso(message.createdAt),
  updatedAt: toIso(message.updatedAt),
  });
};

export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly authService: AuthService,
    private readonly aiOrchestrator: AIOrchestratorService,
    private readonly retrievalService: RetrievalService,
    private readonly chatGuardService: ChatGuardService,
    private readonly sessionIntelligenceService: SessionIntelligenceService,
  ) {}

  private assistantClientMessageId(clientMessageId: string) {
    return `${clientMessageId}:assistant`;
  }

  private normalizeRetryClientMessageId(clientMessageId: string) {
    return clientMessageId.endsWith(':assistant')
      ? clientMessageId.slice(0, -':assistant'.length)
      : clientMessageId;
  }

  private async ensureSession(sessionId: string, userId: string) {
    const session = await this.chatRepository.findSessionById(sessionId, userId);
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Chat session not found.');
    }
    return session;
  }

  private async maybeRetitleSession(
    session: Awaited<ReturnType<ChatRepository['findSessionById']>>,
    message: string,
  ) {
    if (!session || session.title !== DEFAULT_SESSION_TITLE) {
      return session;
    }

    return this.chatRepository.updateSession({
      sessionId: session.id,
      userId: session.userId,
      title: buildSessionTitle(message),
    });
  }

  async listSessions(userId: string, cursor?: string | null, limit?: number) {
    const result = await this.chatRepository.listSessions(userId, { cursor, limit });
    return {
      items: result.items.map(mapSession),
      nextCursor: result.nextCursor,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
    };
  }

  async listArchivedSessions(userId: string, cursor?: string | null, limit?: number) {
    const result = await this.chatRepository.listArchivedSessions(userId, { cursor, limit });
    return {
      items: result.items.map(mapSession),
      nextCursor: result.nextCursor,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
    };
  }

  async listContinueLearningSessions(userId: string) {
    const sessions = await this.chatRepository.listContinueLearningSessions(userId);
    return sessions.map(mapSession);
  }

  async searchSessions(userId: string, query: string) {
    const sessions = await this.chatRepository.searchSessions(userId, query);
    return sessions.map(mapSession);
  }

  async globalSearch(userId: string, query: string, limit = 10, offset = 0) {
    return this.chatRepository.globalSearch(userId, query, limit, offset);
  }

  async createSession(
    userId: string,
    input: {
      title?: string;
      providerPreference: ProviderKey;
    },
  ) {
    const session = await this.chatRepository.createSession({
      userId,
      title: input.title?.trim() || DEFAULT_SESSION_TITLE,
      providerPreference: input.providerPreference,
    });

    return {
      id: session.id,
      title: session.title,
      providerPreference: session.providerPreference,
      contextSummary: session.contextSummary,
      isPinned: session.isPinned,
      pinnedAt: null,
      isArchived: session.isArchived,
      archivedAt: null,
      createdAt: toIso(session.createdAt),
      updatedAt: toIso(session.updatedAt),
      lastMessagePreview: null,
      messageCount: 0,
      artifactCount: 0,
      isUnread: false,
    } satisfies ChatSessionSummary;
  }

  async updateSession(
    userId: string,
    sessionId: string,
    input: {
      title?: string;
      providerPreference?: ProviderKey;
      isPinned?: boolean;
      isArchived?: boolean;
    },
  ) {
    await this.ensureSession(sessionId, userId);
    const session = await this.chatRepository.updateSession({
      sessionId,
      userId,
      ...input,
    });

    return {
      id: session.id,
      title: session.title,
      providerPreference: session.providerPreference,
      contextSummary: session.contextSummary,
      isPinned: session.isPinned,
      pinnedAt: session.pinnedAt ? toIso(session.pinnedAt) : null,
      isArchived: session.isArchived,
      archivedAt: session.archivedAt ? toIso(session.archivedAt) : null,
      createdAt: toIso(session.createdAt),
      updatedAt: toIso(session.updatedAt),
      lastMessagePreview: null,
      messageCount: 0,
      artifactCount: 0,
      isUnread:
        session.lastReadAt != null
          ? session.updatedAt > session.lastReadAt
          : false,
    } satisfies ChatSessionSummary;
  }

  async deleteSession(userId: string, sessionId: string) {
    await this.ensureSession(sessionId, userId);
    await this.chatRepository.deleteSession(sessionId, userId);
  }

  async batchArchiveSessions(userId: string, sessionIds: string[]) {
    await this.chatRepository.batchArchiveSessions(sessionIds, userId);
  }

  async batchDeleteSessions(userId: string, sessionIds: string[]) {
    await this.chatRepository.batchDeleteSessions(sessionIds, userId);
  }

  async getMessages(userId: string, sessionId: string) {
    await this.ensureSession(sessionId, userId);
    await this.chatRepository.markSessionRead(sessionId, userId);
    const messages = await this.chatRepository.getMessages(sessionId, userId);
    return messages.map(mapMessage);
  }

  async ask(
    userId: string,
    payload: {
      sessionId: string;
      clientMessageId: string;
      message: string;
      provider?: ProviderKey;
    },
    callbacks?: {
      onUserMessage?: (message: ChatMessage) => void;
      onAIStart?: (meta: { provider: ProviderKey; model: string }) => void;
      onAIChunk?: (chunk: string, provider: ProviderKey, model: string) => void;
      onAIDone?: (result: ChatAskResponse) => void;
      onMessageFailed?: (message: ChatMessage, error: { code: string; message: string }) => void;
      onSessionUpdated?: (session: ChatSessionSummary) => void;
    },
    internal?: {
      skipAskGuard?: boolean;
    },
  ): Promise<ChatAskResponse> {
    const session = await this.ensureSession(payload.sessionId, userId);
    const user = await this.authService.me(userId);
    const normalizedMessage = internal?.skipAskGuard
      ? this.chatGuardService.normalizeMessage(payload.message)
      : this.chatGuardService.assertCanAsk(userId, payload.message);

    const existingUserMessage = await this.chatRepository.findMessageByClientMessageId(payload.clientMessageId);
    const assistantClientMessageId = this.assistantClientMessageId(payload.clientMessageId);
    const existingAssistantMessage =
      await this.chatRepository.findMessageByClientMessageId(assistantClientMessageId);

    if (
      existingUserMessage?.sessionId === payload.sessionId &&
      existingAssistantMessage?.sessionId === payload.sessionId &&
      existingAssistantMessage.status === 'sent'
    ) {
      return {
        userMessage: mapMessage(existingUserMessage),
        assistantMessage: mapMessage(existingAssistantMessage),
        ai: {
          provider: existingAssistantMessage.provider ?? session.providerPreference,
          model: existingAssistantMessage.model ?? 'unknown',
          providerRequestId: existingAssistantMessage.providerRequestId ?? undefined,
          contentMarkdown: existingAssistantMessage.content,
          finishReason: existingAssistantMessage.responseFinishReason ?? 'stop',
          usage: {
            inputTokens: existingAssistantMessage.inputTokens ?? undefined,
            outputTokens: existingAssistantMessage.outputTokens ?? undefined,
            totalTokens: existingAssistantMessage.totalTokens ?? undefined,
          },
          latencyMs: existingAssistantMessage.latencyMs ?? 0,
          fallbackUsed: existingAssistantMessage.fallbackUsed,
          fallbackInfo:
            ((existingAssistantMessage.retrievalSnapshot as RetrievalSnapshot | null)?.fallbackInfo as
              | AIFallbackInfo
              | null
              | undefined) ?? null,
          warnings: ['Existing response reused.'],
          retrievalSnapshot:
            (existingAssistantMessage.retrievalSnapshot as RetrievalSnapshot | null) ?? null,
        },
      };
    }

    const userMessage =
      existingUserMessage && existingUserMessage.sessionId === payload.sessionId
        ? existingUserMessage
        : await this.chatRepository.createMessage({
            sessionId: payload.sessionId,
            clientMessageId: payload.clientMessageId,
            senderType: 'user',
            content: normalizedMessage,
            status: 'sent',
          });

    callbacks?.onUserMessage?.(mapMessage(userMessage));

    // Retitle session immediately after user message is saved — before AI starts
    const updatedSession = await this.maybeRetitleSession(session, userMessage.content);
    if (updatedSession) {
      callbacks?.onSessionUpdated?.({
        id: updatedSession.id,
        title: updatedSession.title,
        providerPreference: updatedSession.providerPreference,
        contextSummary: updatedSession.contextSummary,
        isPinned: updatedSession.isPinned,
        pinnedAt: updatedSession.pinnedAt ? toIso(updatedSession.pinnedAt) : null,
        isArchived: updatedSession.isArchived,
        archivedAt: updatedSession.archivedAt ? toIso(updatedSession.archivedAt) : null,
        createdAt: toIso(updatedSession.createdAt),
        updatedAt: toIso(updatedSession.updatedAt),
        lastMessagePreview: userMessage.content,
        messageCount: 0,
        artifactCount: 0,
        isUnread: updatedSession.lastReadAt != null && updatedSession.updatedAt > updatedSession.lastReadAt,
      });
    }

    const retrievalContext = await this.retrievalService.retrieveForQuestion({
      userId,
      sessionId: payload.sessionId,
      message: normalizedMessage,
    });

    const assistantPlaceholder =
      existingAssistantMessage && existingAssistantMessage.sessionId === payload.sessionId
        ? await this.chatRepository.updateMessage({
            clientMessageId: assistantClientMessageId,
            content: '',
            status: 'streaming',
            errorCode: null,
            provider: null,
            model: null,
            providerRequestId: null,
            responseFinishReason: null,
            latencyMs: null,
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
            fallbackUsed: false,
            retrievalSnapshot: toJsonValue(retrievalContext),
          })
        : await this.chatRepository.createMessage({
            sessionId: payload.sessionId,
            clientMessageId: assistantClientMessageId,
            parentClientMessageId: payload.clientMessageId,
            senderType: 'assistant',
            content: '',
            status: 'streaming',
            retrievalSnapshot: toJsonValue(retrievalContext),
          });

    const contextMessages = await this.chatRepository.getContextMessages(payload.sessionId, 20);
    let started = false;
    const releaseStream = this.chatGuardService.beginStream(userId);

    try {
      const aiResult = await this.aiOrchestrator.generate({
        userId,
        sessionId: payload.sessionId,
        requestedProvider: payload.provider,
        sessionProvider: session.providerPreference,
        language: user.preferredLanguage,
        contextSummary: session.contextSummary,
        messages: contextMessages.map(mapMessage),
        retrievalPromptContext: retrievalContext.promptContext,
        retrievalSnapshot: retrievalContext,
        subjectHint: retrievalContext.inferredSubject ?? undefined,
        onChunk: (chunk, provider, model) => {
          if (!started) {
            started = true;
            callbacks?.onAIStart?.({ provider, model });
          }

          callbacks?.onAIChunk?.(chunk, provider, model);
        },
      });
      const assistantRetrievalSnapshot = {
        ...(aiResult.retrievalSnapshot ?? retrievalContext),
        ...(aiResult.modelVersionId ? { modelVersionId: aiResult.modelVersionId } : {}),
      } satisfies RetrievalSnapshot;
      const turnIntelligence = await this.sessionIntelligenceService.inferTurnMetadata({
        userId,
        sessionId: payload.sessionId,
        requestedProvider: payload.provider,
        sessionProvider: session.providerPreference,
        language: user.preferredLanguage,
        currentTitle: updatedSession?.title ?? session.title,
        question: normalizedMessage,
        answer: aiResult.contentMarkdown,
        retrievalSnapshot: assistantRetrievalSnapshot,
      });

      const finalAssistant = await this.chatRepository.updateMessage({
        clientMessageId: assistantClientMessageId,
        content: aiResult.contentMarkdown,
        status: aiResult.finishReason === 'error' ? 'failed' : 'sent',
        provider: aiResult.provider,
        model: aiResult.model,
        providerRequestId: aiResult.providerRequestId ?? null,
        responseFinishReason: aiResult.finishReason,
        latencyMs: aiResult.latencyMs,
        inputTokens: aiResult.usage?.inputTokens ?? null,
        outputTokens: aiResult.usage?.outputTokens ?? null,
        totalTokens: aiResult.usage?.totalTokens ?? null,
        confidenceScore: turnIntelligence.confidenceScore,
        subjectLabel: turnIntelligence.subjectLabel,
        topicLabel: turnIntelligence.topicLabel,
        levelLabel: turnIntelligence.levelLabel,
        fallbackUsed: aiResult.fallbackUsed,
        retrievalSnapshot: toJsonValue(assistantRetrievalSnapshot),
        errorCode: aiResult.finishReason === 'error' ? 'AI_PROVIDER_FAILURE' : null,
      });

      const recentMessages = [...contextMessages.map(mapMessage), mapMessage(finalAssistant)];
      const summaryResult = await this.sessionIntelligenceService.summarizeLongSession({
        userId,
        sessionId: payload.sessionId,
        requestedProvider: payload.provider,
        sessionProvider: session.providerPreference,
        language: user.preferredLanguage,
        currentTitle: updatedSession?.title ?? session.title,
        existingSummary: updatedSession?.contextSummary ?? session.contextSummary,
        messages: recentMessages,
      });
      const recentMessageTexts = [...contextMessages, finalAssistant].map((message) => message.content);
      const summarizedSession = await this.chatRepository.updateSession({
        sessionId: payload.sessionId,
        userId,
        title:
          (updatedSession?.title ?? session.title) === DEFAULT_SESSION_TITLE
            ? summaryResult?.titleSuggestion ?? turnIntelligence.titleSuggestion ?? undefined
            : undefined,
        contextSummary: summaryResult?.contextSummary ?? buildContextSummary(recentMessageTexts),
      });

      const sessionSummary: ChatSessionSummary = {
        id: summarizedSession.id,
        title: summarizedSession.title,
        providerPreference: summarizedSession.providerPreference,
        contextSummary: summarizedSession.contextSummary,
        isPinned: summarizedSession.isPinned,
        pinnedAt: summarizedSession.pinnedAt ? toIso(summarizedSession.pinnedAt) : null,
        isArchived: summarizedSession.isArchived,
        archivedAt: summarizedSession.archivedAt ? toIso(summarizedSession.archivedAt) : null,
        createdAt: toIso(summarizedSession.createdAt),
        updatedAt: toIso(summarizedSession.updatedAt),
        lastMessagePreview: aiResult.contentMarkdown,
        messageCount: 0,
        artifactCount: 0,
        isUnread: summarizedSession.lastReadAt != null && summarizedSession.updatedAt > summarizedSession.lastReadAt,
      };
      callbacks?.onSessionUpdated?.(sessionSummary);

      const response: ChatAskResponse = {
        userMessage: mapMessage(userMessage),
        assistantMessage: mapMessage(finalAssistant),
        ai: {
          ...aiResult,
          confidenceScore: turnIntelligence.confidenceScore,
          confidenceLevel:
            turnIntelligence.confidenceScore == null
              ? null
              : turnIntelligence.confidenceScore >= 0.75
                ? 'high'
                : turnIntelligence.confidenceScore >= 0.5
                  ? 'medium'
                  : 'low',
          subjectLabel: turnIntelligence.subjectLabel,
          topicLabel: turnIntelligence.topicLabel,
          levelLabel: turnIntelligence.levelLabel,
        },
      };

      if (aiResult.finishReason === 'error') {
        callbacks?.onMessageFailed?.(response.assistantMessage, {
          code: 'AI_PROVIDER_FAILURE',
          message: 'AI response failed. You can retry the same question.',
        });
      } else {
        callbacks?.onAIDone?.(response);
      }

      return response;
    } catch (error) {
      const appError =
        error instanceof AppError
          ? error
          : new AppError(500, 'CHAT_PIPELINE_FAILED', 'Không thể hoàn tất câu trả lời ở thời điểm này.');

      const failedAssistant = await this.chatRepository.updateMessage({
        clientMessageId: assistantPlaceholder.clientMessageId,
        status: 'failed',
        errorCode: appError.code,
      });
      callbacks?.onMessageFailed?.(mapMessage(failedAssistant), {
        code: appError.code,
        message: appError.message,
      });
      throw appError;
    } finally {
      releaseStream();
    }
  }

  async retry(
    userId: string,
    payload: {
      sessionId: string;
      clientMessageId: string;
      message?: string;
      provider?: ProviderKey;
    },
    callbacks?: Parameters<ChatService['ask']>[2],
  ) {
    const normalizedClientMessageId = this.normalizeRetryClientMessageId(payload.clientMessageId);
    const message = await this.chatRepository.findMessageByClientMessageId(normalizedClientMessageId);
    const retryContent =
      message && message.sessionId === payload.sessionId && message.senderType === 'user'
        ? message.content
        : payload.message?.trim();

    if (!retryContent) {
      throw new AppError(404, 'MESSAGE_NOT_FOUND', 'Original user message not found.');
    }

    const normalizedRetryContent = this.chatGuardService.assertCanRetry(userId, retryContent);

    return this.ask(
      userId,
      {
        sessionId: payload.sessionId,
        clientMessageId: normalizedClientMessageId,
        message: normalizedRetryContent,
        provider: payload.provider,
      },
      callbacks,
      {
        skipAskGuard: true,
      },
    );
  }

  async syncMessages(userId: string, sessionId: string, since?: string) {
    const messages = await this.chatRepository.findMessagesSince(
      sessionId,
      userId,
      since ? new Date(since) : undefined,
    );

    return messages.map(mapMessage);
  }
}
