import type { ChatAskResponse, ChatMessage, ChatSessionSummary, ProviderKey } from '@chatbot-ai/shared';

import { buildContextSummary, buildSessionTitle } from '../../utils/text';
import { AppError } from '../../utils/errors';
import type { AuthService } from '../auth/auth.service';
import { AIOrchestratorService } from '../../integrations/ai/ai-orchestrator.service';
import { ChatRepository } from './chat.repository';

const DEFAULT_SESSION_TITLE = 'Tro chuyen moi / New study chat';

const toIso = (value: Date) => value.toISOString();

const mapSession = (
  session: Awaited<ReturnType<ChatRepository['listSessions']>>[number],
): ChatSessionSummary => ({
  id: session.id,
  title: session.title,
  providerPreference: session.providerPreference,
  contextSummary: session.contextSummary,
  createdAt: toIso(session.createdAt),
  updatedAt: toIso(session.updatedAt),
  lastMessagePreview: session.messages[0]?.content ?? null,
  messageCount: session._count.messages,
});

const mapMessage = (
  message:
    | Awaited<ReturnType<ChatRepository['getMessages']>>[number]
    | Awaited<ReturnType<ChatRepository['createMessage']>>,
): ChatMessage => ({
  id: message.id,
  sessionId: message.sessionId,
  clientMessageId: message.clientMessageId,
  senderType: message.senderType,
  content: message.content,
  status: message.status,
  provider: message.provider ?? null,
  model: message.model ?? null,
  latencyMs: message.latencyMs ?? null,
  errorCode: message.errorCode ?? null,
  createdAt: toIso(message.createdAt),
  updatedAt: toIso(message.updatedAt),
});

export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly authService: AuthService,
    private readonly aiOrchestrator: AIOrchestratorService,
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

  private async maybeRetitleSession(session: Awaited<ReturnType<ChatRepository['findSessionById']>>, message: string) {
    if (!session || session.title !== DEFAULT_SESSION_TITLE) {
      return session;
    }

    return this.chatRepository.updateSession({
      sessionId: session.id,
      userId: session.userId,
      title: buildSessionTitle(message),
    });
  }

  async listSessions(userId: string) {
    const sessions = await this.chatRepository.listSessions(userId);
    return sessions.map(mapSession);
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
      createdAt: toIso(session.createdAt),
      updatedAt: toIso(session.updatedAt),
      lastMessagePreview: null,
      messageCount: 0,
    } satisfies ChatSessionSummary;
  }

  async updateSession(
    userId: string,
    sessionId: string,
    input: {
      title?: string;
      providerPreference?: ProviderKey;
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
      createdAt: toIso(session.createdAt),
      updatedAt: toIso(session.updatedAt),
      lastMessagePreview: null,
      messageCount: 0,
    } satisfies ChatSessionSummary;
  }

  async deleteSession(userId: string, sessionId: string) {
    await this.ensureSession(sessionId, userId);
    await this.chatRepository.deleteSession(sessionId, userId);
  }

  async getMessages(userId: string, sessionId: string) {
    await this.ensureSession(sessionId, userId);
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
  ): Promise<ChatAskResponse> {
    const session = await this.ensureSession(payload.sessionId, userId);
    const user = await this.authService.me(userId);

    const existingUserMessage = await this.chatRepository.findMessageByClientMessageId(payload.clientMessageId);
    const assistantClientMessageId = this.assistantClientMessageId(payload.clientMessageId);
    const existingAssistantMessage =
      await this.chatRepository.findMessageByClientMessageId(assistantClientMessageId);

    if (
      existingUserMessage?.sessionId === payload.sessionId &&
      existingAssistantMessage?.sessionId === payload.sessionId &&
      existingAssistantMessage.status === 'sent'
    ) {
      const response: ChatAskResponse = {
        userMessage: mapMessage(existingUserMessage),
        assistantMessage: mapMessage(existingAssistantMessage),
        ai: {
          provider: existingAssistantMessage.provider ?? session.providerPreference,
          model: existingAssistantMessage.model ?? 'unknown',
          contentMarkdown: existingAssistantMessage.content,
          finishReason: 'stop',
          latencyMs: existingAssistantMessage.latencyMs ?? 0,
          fallbackUsed: false,
          warnings: ['Existing response reused.'],
        },
      };

      return response;
    }

    const userMessage =
      existingUserMessage && existingUserMessage.sessionId === payload.sessionId
        ? existingUserMessage
        : await this.chatRepository.createMessage({
            sessionId: payload.sessionId,
            clientMessageId: payload.clientMessageId,
            senderType: 'user',
            content: payload.message,
            status: 'sent',
          });

    callbacks?.onUserMessage?.(mapMessage(userMessage));

    const assistantPlaceholder =
      existingAssistantMessage && existingAssistantMessage.sessionId === payload.sessionId
        ? await this.chatRepository.updateMessage({
            clientMessageId: assistantClientMessageId,
            content: '',
            status: 'streaming',
            errorCode: null,
            provider: null,
            model: null,
            latencyMs: null,
          })
        : await this.chatRepository.createMessage({
            sessionId: payload.sessionId,
            clientMessageId: assistantClientMessageId,
            senderType: 'assistant',
            content: '',
            status: 'streaming',
          });

    const updatedSession = await this.maybeRetitleSession(session, userMessage.content);
    if (updatedSession) {
      callbacks?.onSessionUpdated?.({
        id: updatedSession.id,
        title: updatedSession.title,
        providerPreference: updatedSession.providerPreference,
        contextSummary: updatedSession.contextSummary,
        createdAt: toIso(updatedSession.createdAt),
        updatedAt: toIso(updatedSession.updatedAt),
        lastMessagePreview: userMessage.content,
        messageCount: 0,
      });
    }

    const contextMessages = await this.chatRepository.getContextMessages(payload.sessionId, 20);
    let started = false;

    const aiResult = await this.aiOrchestrator.generate({
      requestedProvider: payload.provider,
      sessionProvider: session.providerPreference,
      language: user.preferredLanguage,
      contextSummary: session.contextSummary,
      messages: contextMessages.map(mapMessage),
      onChunk: (chunk, provider, model) => {
        if (!started) {
          started = true;
          callbacks?.onAIStart?.({ provider, model });
        }

        callbacks?.onAIChunk?.(chunk, provider, model);
      },
    });

    const finalAssistant = await this.chatRepository.updateMessage({
      clientMessageId: assistantClientMessageId,
      content: aiResult.contentMarkdown,
      status: aiResult.finishReason === 'error' ? 'failed' : 'sent',
      provider: aiResult.provider,
      model: aiResult.model,
      latencyMs: aiResult.latencyMs,
      errorCode: aiResult.finishReason === 'error' ? 'AI_PROVIDER_FAILURE' : null,
    });

    const recentMessageTexts = [...contextMessages, finalAssistant].map((message) => message.content);
    const summarizedSession = await this.chatRepository.updateSession({
      sessionId: payload.sessionId,
      userId,
      contextSummary: buildContextSummary(recentMessageTexts),
    });

    const sessionSummary: ChatSessionSummary = {
      id: summarizedSession.id,
      title: summarizedSession.title,
      providerPreference: summarizedSession.providerPreference,
      contextSummary: summarizedSession.contextSummary,
      createdAt: toIso(summarizedSession.createdAt),
      updatedAt: toIso(summarizedSession.updatedAt),
      lastMessagePreview: aiResult.contentMarkdown,
      messageCount: 0,
    };
    callbacks?.onSessionUpdated?.(sessionSummary);

    const response: ChatAskResponse = {
      userMessage: mapMessage(userMessage),
      assistantMessage: mapMessage(finalAssistant),
      ai: aiResult,
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

    return this.ask(
      userId,
      {
        sessionId: payload.sessionId,
        clientMessageId: normalizedClientMessageId,
        message: retryContent,
        provider: payload.provider,
      },
      callbacks,
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
