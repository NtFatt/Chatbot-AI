import type { AIChatResult, AppLanguage, ChatMessage, ProviderKey, RetrievalSnapshot } from '@chatbot-ai/shared';
import { buildStudySystemPrompt } from '@chatbot-ai/shared';

import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { truncateText } from '../../utils/text';
import { UsageService } from '../../modules/usage/usage.service';
import type { ProviderDescriptor } from '../../modules/providers/providers.service';
import { ProvidersService } from '../../modules/providers/providers.service';
import { sanitizeAIResponse, isRenderableAIResponse } from './response-sanitizer';
import { ProviderHealthService } from './provider-health.service';
import type { AIConversationMessage, AIProvider, AIProviderErrorDescriptor } from './ai.types';
import { buildLocalStudyFallback } from './local-study-fallback';

const classifyProviderError = (error: unknown): AIProviderErrorDescriptor => {
  const message = error instanceof Error ? error.message : 'UNKNOWN_AI_PROVIDER_ERROR';
  const normalized = message.toUpperCase();

  if (
    normalized.includes('TIMEOUT') ||
    normalized.includes('RATE_LIMIT') ||
    normalized.includes('429') ||
    normalized.includes('ECONNRESET') ||
    normalized.includes('ETIMEDOUT') ||
    normalized.includes('503') ||
    normalized.includes('502') ||
    normalized.includes('NETWORK')
  ) {
    return {
      code: normalized.replace(/\s+/g, '_').slice(0, 80) || 'AI_PROVIDER_RETRYABLE_ERROR',
      message,
      retryable: true,
    };
  }

  if (
    normalized.includes('API KEY') ||
    normalized.includes('AUTH') ||
    normalized.includes('UNAUTHORIZED') ||
    normalized.includes('INVALID MODEL') ||
    normalized.includes('MALFORMED') ||
    normalized.includes('SAFETY')
  ) {
    return {
      code: normalized.replace(/\s+/g, '_').slice(0, 80) || 'AI_PROVIDER_FATAL_ERROR',
      message,
      retryable: false,
    };
  }

  return {
    code: normalized.replace(/\s+/g, '_').slice(0, 80) || 'AI_PROVIDER_ERROR',
    message,
    retryable: normalized.includes('5'),
  };
};

const isConfigurationError = (descriptor: AIProviderErrorDescriptor | null) =>
  Boolean(
    descriptor &&
      (descriptor.code.includes('API_KEY') ||
        descriptor.code.includes('AUTH') ||
        descriptor.code.includes('UNAUTHORIZED') ||
        descriptor.code.includes('INVALID_MODEL') ||
        descriptor.code.includes('MALFORMED')),
  );

export class AIOrchestratorService {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly providers: Record<ProviderKey, AIProvider | null>,
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

  private getOrderedProviders(
    available: ProviderDescriptor[],
    requestedProvider: ProviderKey | undefined,
    sessionProvider: ProviderKey,
    defaultProvider: ProviderKey,
    fallbackProvider: ProviderKey | null,
  ) {
    const order = [requestedProvider, sessionProvider, defaultProvider, fallbackProvider].filter(
      (item): item is ProviderKey => Boolean(item),
    );

    return Array.from(new Set(order)).flatMap((key) =>
      available.filter((provider) => provider.key === key && provider.enabled && provider.configured),
    );
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
    const candidates = this.getOrderedProviders(
      providersState.providers,
      input.requestedProvider,
      input.sessionProvider,
      providersState.defaultProvider,
      providersState.fallbackProvider,
    );

    const { messages, warnings } = this.compactMessages({
      contextSummary: input.contextSummary,
      messages: input.messages,
    });

    const systemPrompt = buildStudySystemPrompt({
      language: input.language,
      subjectHint: input.subjectHint ?? input.retrievalSnapshot?.inferredSubject ?? null,
      retrievalContext: input.retrievalPromptContext ?? null,
    });

    if (candidates.length === 0) {
      return buildLocalStudyFallback({
        provider: input.sessionProvider,
        model: 'local-study-fallback',
        language: input.language,
        messages: input.messages,
        requestedProvider: input.requestedProvider,
        reason: 'missing_configuration',
        warnings: ['No external AI providers are currently available.'],
      });
    }

    let lastError: unknown = null;
    let lastClassifiedError: AIProviderErrorDescriptor | null = null;

    for (const [index, providerState] of candidates.entries()) {
      const availability = this.providerHealthService.canAttempt(providerState.key);
      if (!availability.allowed) {
        warnings.push(
          `${providerState.key} is cooling down for another ${Math.ceil(
            availability.cooldownRemainingMs / 1000,
          )} seconds.`,
        );
        continue;
      }

      const provider = this.providers[providerState.key];
      if (!provider) {
        warnings.push(`${providerState.key} client is not initialized on this server.`);
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

          return {
            provider: providerState.key,
            model: providerState.model,
            providerRequestId: response.providerRequestId,
            contentMarkdown: sanitizedResponse,
            finishReason: response.finishReason,
            usage: response.usage,
            latencyMs: response.latencyMs,
            fallbackUsed: index > 0,
            warnings,
            retrievalSnapshot: input.retrievalSnapshot ?? null,
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
            break;
          }
        }
      }
    }

    logger.error({ err: lastError }, 'All AI providers failed');

    if (env.AI_LOCAL_FALLBACK_ENABLED) {
      return buildLocalStudyFallback({
        provider: candidates[0]?.key ?? input.sessionProvider,
        model: candidates[0]?.model ?? 'local-study-fallback',
        language: input.language,
        messages: input.messages,
        requestedProvider: input.requestedProvider,
        reason: isConfigurationError(lastClassifiedError)
          ? 'missing_configuration'
          : 'provider_unavailable',
        warnings: [...warnings, 'AI provider fallback exhausted.'],
        lastError,
      });
    }

    return {
      provider: candidates[0]?.key ?? input.sessionProvider,
      model: candidates[0]?.model ?? 'unknown',
      contentMarkdown: 'Không thể tạo phản hồi AI ở thời điểm này.',
      finishReason: 'error',
      latencyMs: 0,
      fallbackUsed: true,
      warnings: [...warnings, 'AI provider fallback exhausted and local fallback is disabled.'],
      retrievalSnapshot: input.retrievalSnapshot ?? null,
    };
  }
}
