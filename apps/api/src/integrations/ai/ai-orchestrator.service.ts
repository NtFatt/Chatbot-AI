import type {
  AIFallbackInfo,
  AIFallbackNotice,
  AIChatResult,
  AppLanguage,
  ChatMessage,
  ProviderKey,
  RetrievalSnapshot,
} from '@chatbot-ai/shared';
import { buildStudySystemPrompt } from '@chatbot-ai/shared';

import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { truncateText } from '../../utils/text';
import { UsageService } from '../../modules/usage/usage.service';
import { ProvidersService } from '../../modules/providers/providers.service';
import { sanitizeAIResponse, isRenderableAIResponse } from './response-sanitizer';
import { ProviderHealthService } from './provider-health.service';
import type { AIConversationMessage, AIProvider, AIProviderErrorDescriptor } from './ai.types';
import { buildLocalStudyFallback } from './local-study-fallback';
import {
  buildCooldownNotice,
  buildFallbackNotice,
  buildLocalFallbackNotice,
  buildProviderFailureNotice,
  buildSecondaryProviderNotice,
  classifyProviderError,
  isConfigurationError,
  orderProviderCandidates,
} from './provider-runtime';

const dedupeFallbackNotices = (notices: AIFallbackNotice[]) => {
  const seen = new Set<string>();
  return notices.filter((notice) => {
    const key = [
      notice.category,
      notice.provider ?? '',
      notice.fallbackProvider ?? '',
      notice.retryAfterSeconds ?? '',
      notice.cooldownRemainingMs ?? '',
      notice.message,
    ].join('|');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const buildFallbackInfo = (notices: AIFallbackNotice[]): AIFallbackInfo | null => {
  const deduped = dedupeFallbackNotices(notices);
  if (deduped.length === 0) {
    return null;
  }

  return {
    notices: deduped,
    localFallbackUsed: deduped.some((notice) => notice.category === 'local_fallback_used'),
    secondaryProviderUsed: deduped.some((notice) => notice.category === 'secondary_provider_used'),
  };
};

const mergeRetrievalSnapshot = (
  retrievalSnapshot: RetrievalSnapshot | null | undefined,
  fallbackInfo: AIFallbackInfo | null,
): RetrievalSnapshot | null => {
  if (!retrievalSnapshot) {
    return null;
  }

  return fallbackInfo ? { ...retrievalSnapshot, fallbackInfo } : retrievalSnapshot;
};

const fallbackWarnings = (contextWarnings: string[], fallbackInfo: AIFallbackInfo | null) => [
  ...contextWarnings,
  ...(fallbackInfo?.notices.map((notice) => notice.message) ?? []),
];

export class AIOrchestratorService {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly providers: Partial<Record<ProviderKey, AIProvider | null>>,
    private readonly providerHealthService: ProviderHealthService,
    private readonly usageService: UsageService,
  ) {}

  private compactMessages(input: {
    contextSummary?: string | null;
    messages: ChatMessage[];
  }): { messages: AIConversationMessage[]; warnings: string[] } {
    const warnings: string[] = [];

    const selected = input.messages
      .filter((message) => message.senderType !== 'system' && message.status !== 'failed')
      .slice(-env.AI_MAX_CONTEXT_MESSAGES)
      .map((message) => ({
        role: message.senderType === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      })) satisfies AIConversationMessage[];

    if (input.contextSummary) {
      selected.unshift({
        role: 'assistant',
        content: `Conversation summary:\n${truncateText(input.contextSummary, 500)}`,
      });
    }

    while (
      selected.reduce((total, message) => total + message.content.length, 0) >
        env.AI_MAX_PROMPT_CHARS &&
      selected.length > 4
    ) {
      selected.shift();
      warnings.push('Context window compacted to fit model limits.');
    }

    return {
      messages: selected,
      warnings,
    };
  }

  async generate(input: {
    userId: string;
    sessionId: string;
    requestedProvider?: ProviderKey;
    sessionProvider: ProviderKey;
    language: AppLanguage;
    contextSummary?: string | null;
    messages: ChatMessage[];
    subjectHint?: string | null;
    retrievalPromptContext?: string | null;
    retrievalSnapshot?: RetrievalSnapshot | null;
    onChunk?: (chunk: string, provider: ProviderKey, model: string) => void;
  }): Promise<AIChatResult> {
    const providersState = await this.providersService.listProviders();
    const candidates = orderProviderCandidates(
      providersState.providers,
      input.requestedProvider,
      input.sessionProvider,
      providersState.defaultProvider,
      providersState.fallbackProvider,
    );

    const { messages, warnings: contextWarnings } = this.compactMessages({
      contextSummary: input.contextSummary,
      messages: input.messages,
    });
    const fallbackNotices: AIFallbackNotice[] = [];

    const systemPrompt = buildStudySystemPrompt({
      language: input.language,
      subjectHint: input.subjectHint ?? input.retrievalSnapshot?.inferredSubject ?? null,
      retrievalContext: input.retrievalPromptContext ?? null,
    });

    if (candidates.length === 0) {
      const provider = input.requestedProvider ?? input.sessionProvider;
      const fallbackInfo = buildFallbackInfo([
        buildFallbackNotice({
          category: 'missing_credentials',
          language: input.language,
          provider,
        }),
        buildLocalFallbackNotice({
          language: input.language,
          provider,
        }),
      ]);

      return buildLocalStudyFallback({
        provider: input.sessionProvider,
        model: 'local-study-fallback',
        language: input.language,
        messages: input.messages,
        requestedProvider: input.requestedProvider,
        reason: 'missing_configuration',
        warnings: fallbackWarnings(contextWarnings, fallbackInfo),
        fallbackInfo,
        retrievalSnapshot: mergeRetrievalSnapshot(input.retrievalSnapshot, fallbackInfo),
      });
    }

    let lastError: unknown = null;
    let lastClassifiedError: AIProviderErrorDescriptor | null = null;
    const failedProviders: ProviderKey[] = [];

    for (const [index, providerState] of candidates.entries()) {
      const availability = this.providerHealthService.canAttempt(providerState.key);
      if (!availability.allowed) {
        fallbackNotices.push(
          buildCooldownNotice({
            provider: providerState.key,
            language: input.language,
            cooldownRemainingMs: availability.cooldownRemainingMs,
          }),
        );
        continue;
      }

      const provider = this.providers[providerState.key];
      if (!provider) {
        failedProviders.push(providerState.key);
        fallbackNotices.push(
          buildFallbackNotice({
            category: 'provider_unavailable',
            language: input.language,
            provider: providerState.key,
          }),
        );
        continue;
      }

      for (let attempt = 0; attempt <= providerState.maxRetries; attempt += 1) {
        try {
          const response = await provider.generate(
            {
              provider: providerState.key,
              model: providerState.model,
              systemPrompt,
              messages,
              timeoutMs: providerState.timeoutMs,
            },
            {
              onChunk: (chunk) => input.onChunk?.(chunk, providerState.key, providerState.model),
            },
          );

          const sanitizedResponse = sanitizeAIResponse(response.text);
          if (!isRenderableAIResponse(sanitizedResponse)) {
            throw new Error('EMPTY_AI_RESPONSE');
          }

          this.providerHealthService.recordSuccess(providerState.key);
          await this.usageService.recordUsage({
            userId: input.userId,
            sessionId: input.sessionId,
            provider: providerState.key,
            model: providerState.model,
            inputTokens: response.usage?.inputTokens,
            outputTokens: response.usage?.outputTokens,
            totalTokens: response.usage?.totalTokens,
            latencyMs: response.latencyMs,
            success: true,
            fallbackUsed: index > 0,
          });

          const successNotices = [...fallbackNotices];
          if (index > 0) {
            const failedProvider = failedProviders[0] ?? candidates[0]?.key;
            if (failedProvider && failedProvider !== providerState.key) {
              successNotices.push(
                buildSecondaryProviderNotice({
                  language: input.language,
                  failedProvider,
                  answeredBy: providerState.key,
                }),
              );
            }
          }
          const fallbackInfo = buildFallbackInfo(successNotices);

          return {
            provider: providerState.key,
            model: providerState.model,
            modelVersionId: providerState.modelVersionId ?? null,
            providerRequestId: response.providerRequestId,
            contentMarkdown: sanitizedResponse,
            finishReason: response.finishReason,
            usage: response.usage,
            latencyMs: response.latencyMs,
            fallbackUsed: index > 0,
            fallbackInfo,
            warnings: fallbackWarnings(contextWarnings, fallbackInfo),
            retrievalSnapshot: mergeRetrievalSnapshot(input.retrievalSnapshot, fallbackInfo),
          };
        } catch (error) {
          lastError = error;
          const classifiedError = classifyProviderError(error);
          lastClassifiedError = classifiedError;
          this.providerHealthService.recordFailure({
            provider: providerState.key,
            code: classifiedError.code,
            message: classifiedError.message,
            retryable: classifiedError.retryable,
          });
          await this.usageService.recordIncident({
            provider: providerState.key,
            model: providerState.model,
            errorCode: classifiedError.code,
            errorMessage: classifiedError.message,
            retryable: classifiedError.retryable,
          });
          await this.usageService.recordUsage({
            userId: input.userId,
            sessionId: input.sessionId,
            provider: providerState.key,
            model: providerState.model,
            latencyMs: 0,
            success: false,
            fallbackUsed: index > 0,
          });

          logger.warn(
            {
              err: error,
              provider: providerState.key,
              model: providerState.model,
              attempt,
              retryable: classifiedError.retryable,
            },
            'AI provider invocation failed',
          );

          if (!classifiedError.retryable || attempt >= providerState.maxRetries) {
            failedProviders.push(providerState.key);
            fallbackNotices.push(
              buildProviderFailureNotice({
                provider: providerState.key,
                language: input.language,
                descriptor: classifiedError,
              }),
            );
            break;
          }
        }
      }
    }

    logger.error({ err: lastError }, 'All AI providers failed');

    if (env.AI_LOCAL_FALLBACK_ENABLED) {
      const fallbackInfo = buildFallbackInfo([
        ...fallbackNotices,
        buildLocalFallbackNotice({
          language: input.language,
          provider: failedProviders[0] ?? candidates[0]?.key ?? input.sessionProvider,
        }),
      ]);

      return buildLocalStudyFallback({
        provider: candidates[0]?.key ?? input.sessionProvider,
        model: candidates[0]?.model ?? 'local-study-fallback',
        language: input.language,
        messages: input.messages,
        requestedProvider: input.requestedProvider,
        reason: isConfigurationError(lastClassifiedError)
          ? 'missing_configuration'
          : 'provider_unavailable',
        warnings: fallbackWarnings(contextWarnings, fallbackInfo),
        fallbackInfo,
        retrievalSnapshot: mergeRetrievalSnapshot(input.retrievalSnapshot, fallbackInfo),
      });
    }

    const fallbackInfo = buildFallbackInfo(fallbackNotices);

    return {
      provider: candidates[0]?.key ?? input.sessionProvider,
      model: candidates[0]?.model ?? 'unknown',
      modelVersionId: candidates[0]?.modelVersionId ?? null,
      contentMarkdown: 'Không thể tạo phản hồi AI ở thời điểm này.',
      finishReason: 'error',
      latencyMs: 0,
      fallbackUsed: true,
      fallbackInfo,
      warnings: fallbackWarnings(contextWarnings, fallbackInfo),
      retrievalSnapshot: mergeRetrievalSnapshot(input.retrievalSnapshot, fallbackInfo),
    };
  }
}
