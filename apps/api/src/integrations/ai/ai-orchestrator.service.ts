import type { AIChatResult, AppLanguage, ChatMessage, ProviderKey } from '@chatbot-ai/shared';
import { buildStudySystemPrompt } from '@chatbot-ai/shared';

import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { truncateText } from '../../utils/text';
import type { ProviderDescriptor } from '../../modules/providers/providers.service';
import { ProvidersService } from '../../modules/providers/providers.service';
import type { AIConversationMessage, AIProvider } from './ai.types';
import { buildLocalStudyFallback } from './local-study-fallback';

export class AIOrchestratorService {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly providers: Record<ProviderKey, AIProvider | null>,
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
      available.filter((provider) => provider.key === key && provider.enabled),
    );
  }

  async generate(input: {
    requestedProvider?: ProviderKey;
    sessionProvider: ProviderKey;
    language: AppLanguage;
    contextSummary?: string | null;
    messages: ChatMessage[];
    subjectHint?: string | null;
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

    if (candidates.length === 0) {
      return buildLocalStudyFallback({
        provider: input.sessionProvider,
        model: 'local-study-fallback',
        language: input.language,
        messages: input.messages,
        requestedProvider: input.requestedProvider,
        warnings: ['No AI providers are configured on the server.'],
      });
    }

    const { messages, warnings } = this.compactMessages({
      contextSummary: input.contextSummary,
      messages: input.messages,
    });

    const systemPrompt = buildStudySystemPrompt({
      language: input.language,
      subjectHint: input.subjectHint,
    });

    let lastError: unknown = null;

    for (const [index, providerState] of candidates.entries()) {
      const provider = this.providers[providerState.key];
      if (!provider) {
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

          if (!response.text.trim()) {
            throw new Error('EMPTY_AI_RESPONSE');
          }

          return {
            provider: providerState.key,
            model: providerState.model,
            contentMarkdown: response.text.trim(),
            finishReason: response.finishReason,
            usage: response.usage,
            latencyMs: response.latencyMs,
            fallbackUsed: index > 0,
            warnings,
          };
        } catch (error) {
          lastError = error;
          logger.warn(
            {
              err: error,
              provider: providerState.key,
              attempt,
            },
            'AI provider invocation failed',
          );
        }
      }
    }

    logger.error({ err: lastError }, 'All AI providers failed');

    return buildLocalStudyFallback({
      provider: candidates[0]?.key ?? input.sessionProvider,
      model: candidates[0]?.model ?? 'local-study-fallback',
      language: input.language,
      messages: input.messages,
      requestedProvider: input.requestedProvider,
      warnings: [...warnings, 'AI provider fallback exhausted.'],
      lastError,
    });
  }
}
