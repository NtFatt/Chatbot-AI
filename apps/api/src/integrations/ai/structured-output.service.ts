import type { ProviderKey } from '@chatbot-ai/shared';
import { z } from 'zod';

import { logger } from '../../config/logger';
import { AppError } from '../../utils/errors';
import { UsageService } from '../../modules/usage/usage.service';
import { ProvidersService } from '../../modules/providers/providers.service';
import { ProviderHealthService } from './provider-health.service';
import type { AIConversationMessage, AIProvider } from './ai.types';
import {
  buildCooldownNotice,
  buildProviderFailureNotice,
  classifyProviderError,
  orderProviderCandidates,
} from './provider-runtime';

const warningLanguage = 'vi' as const;

export interface StructuredOutputSuccess<T> {
  data: T;
  provider: ProviderKey;
  model: string;
  providerRequestId?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
  providerFallbackUsed: boolean;
  legacyFallbackUsed: boolean;
  warnings: string[];
}

export interface StructuredOutputLegacyFallback<T> {
  systemPrompt: string;
  messages: AIConversationMessage[];
  parse: (text: string) => T;
}

export class StructuredOutputService {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly providers: Record<ProviderKey, AIProvider | null>,
    private readonly providerHealthService: ProviderHealthService,
    private readonly usageService: UsageService,
  ) {}

  private parseStructuredPayload<T>(
    schema: z.ZodType<T>,
    response: Awaited<ReturnType<AIProvider['generate']>>,
  ) {
    const candidate =
      response.structuredData ??
      (() => {
        const trimmed = response.text.trim();
        if (!trimmed) {
          throw new Error('STRUCTURED_OUTPUT_EMPTY');
        }
        try {
          return JSON.parse(trimmed) as unknown;
        } catch {
          throw new Error('STRUCTURED_OUTPUT_INVALID_JSON');
        }
      })();

    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(`STRUCTURED_OUTPUT_VALIDATION_FAILED: ${parsed.error.issues[0]?.message ?? 'Unknown validation error'}`);
    }

    return parsed.data;
  }

  private async attemptProvider<T>(input: {
    userId: string;
    sessionId?: string | null;
    messageId?: string | null;
    providerKey: ProviderKey;
    model: string;
    timeoutMs: number;
    maxRetries: number;
    systemPrompt: string;
    messages: AIConversationMessage[];
    schema?: z.ZodType<T>;
    structuredName?: string;
    structuredDescription?: string;
    structuredJsonSchema?: Record<string, unknown>;
    parseText?: (text: string) => T;
    mode: 'structured' | 'legacy';
    providerFallbackUsed: boolean;
  }): Promise<StructuredOutputSuccess<T>> {
    const provider = this.providers[input.providerKey];
    if (!provider) {
      throw new Error(`${input.providerKey}_CLIENT_NOT_INITIALIZED`);
    }

    for (let attempt = 0; attempt <= input.maxRetries; attempt += 1) {
      try {
        const response = await provider.generate({
          provider: input.providerKey,
          model: input.model,
          systemPrompt: input.systemPrompt,
          messages: input.messages,
          timeoutMs: input.timeoutMs,
          temperature: input.mode === 'structured' ? 0.2 : 0.3,
          structuredOutput:
            input.mode === 'structured' && input.structuredName && input.structuredJsonSchema
              ? {
                  name: input.structuredName,
                  description: input.structuredDescription,
                  jsonSchema: input.structuredJsonSchema,
                }
              : undefined,
        });

        const data =
          input.mode === 'structured' && input.schema
            ? this.parseStructuredPayload(input.schema, response)
            : input.parseText
              ? input.parseText(response.text)
              : (() => {
                  throw new Error('LEGACY_FALLBACK_PARSER_MISSING');
                })();

        this.providerHealthService.recordSuccess(input.providerKey);
        if (input.sessionId) {
          await this.usageService.recordUsage({
            userId: input.userId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            provider: input.providerKey,
            model: input.model,
            inputTokens: response.usage?.inputTokens,
            outputTokens: response.usage?.outputTokens,
            totalTokens: response.usage?.totalTokens,
            latencyMs: response.latencyMs,
            success: true,
            fallbackUsed: input.providerFallbackUsed || input.mode === 'legacy',
          });
        }

        return {
          data,
          provider: input.providerKey,
          model: input.model,
          providerRequestId: response.providerRequestId,
          usage: response.usage,
          latencyMs: response.latencyMs,
          providerFallbackUsed: input.providerFallbackUsed,
          legacyFallbackUsed: input.mode === 'legacy',
          warnings:
            input.mode === 'legacy'
              ? ['Không thể tạo structured output ổn định, hệ thống đã dùng đường phân tích dự phòng.']
              : [],
        };
      } catch (error) {
        const classified = classifyProviderError(error);
        this.providerHealthService.recordFailure({
          provider: input.providerKey,
          code: classified.code,
          message: classified.message,
          retryable: classified.retryable,
        });
        await this.usageService.recordIncident({
          provider: input.providerKey,
          model: input.model,
          errorCode: classified.code,
          errorMessage: classified.message,
          retryable: classified.retryable,
        });
        if (input.sessionId) {
          await this.usageService.recordUsage({
            userId: input.userId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            provider: input.providerKey,
            model: input.model,
            latencyMs: 0,
            success: false,
            fallbackUsed: input.providerFallbackUsed || input.mode === 'legacy',
          });
        }

        logger.warn(
          {
            err: error,
            provider: input.providerKey,
            model: input.model,
            mode: input.mode,
            attempt,
            retryable: classified.retryable,
          },
          'Structured output provider invocation failed',
        );

        if (!classified.retryable || attempt >= input.maxRetries) {
          throw error;
        }
      }
    }

    throw new Error('STRUCTURED_OUTPUT_PROVIDER_ATTEMPTS_EXHAUSTED');
  }

  async generate<T>(input: {
    userId: string;
    sessionId?: string | null;
    messageId?: string | null;
    requestedProvider?: ProviderKey;
    sessionProvider: ProviderKey;
    schemaName: string;
    schemaDescription?: string;
    schema: z.ZodType<T>;
    jsonSchema: Record<string, unknown>;
    systemPrompt: string;
    messages: AIConversationMessage[];
    legacyFallback?: StructuredOutputLegacyFallback<T>;
  }): Promise<StructuredOutputSuccess<T>> {
    const providersState = await this.providersService.listProviders();
    const candidates = orderProviderCandidates(
      providersState.providers,
      input.requestedProvider,
      input.sessionProvider,
      providersState.defaultProvider,
      providersState.fallbackProvider,
    );

    if (candidates.length === 0) {
      throw new AppError(
        503,
        'AI_PROVIDER_UNAVAILABLE',
        'Không có AI provider khả dụng để tạo structured output.',
      );
    }

    const structuredWarnings: string[] = [];
    let skippedForCooldownOnly = true;
    let attemptedStructuredProvider = false;

    for (const [index, providerState] of candidates.entries()) {
      const availability = this.providerHealthService.canAttempt(providerState.key);
      if (!availability.allowed) {
        structuredWarnings.push(
          buildCooldownNotice({
            provider: providerState.key,
            language: warningLanguage,
            cooldownRemainingMs: availability.cooldownRemainingMs,
          }).message,
        );
        continue;
      }

      skippedForCooldownOnly = false;
      attemptedStructuredProvider = true;

      try {
        const result = await this.attemptProvider({
          userId: input.userId,
          sessionId: input.sessionId,
          messageId: input.messageId,
          providerKey: providerState.key,
          model: providerState.model,
          timeoutMs: providerState.timeoutMs,
          maxRetries: providerState.maxRetries,
          systemPrompt: input.systemPrompt,
          messages: input.messages,
          schema: input.schema,
          structuredName: input.schemaName,
          structuredDescription: input.schemaDescription,
          structuredJsonSchema: input.jsonSchema,
          mode: 'structured',
          providerFallbackUsed: index > 0,
        });
        return {
          ...result,
          warnings: [...structuredWarnings, ...result.warnings],
        };
      } catch (error) {
        structuredWarnings.push(
          buildProviderFailureNotice({
            provider: providerState.key,
            language: warningLanguage,
            descriptor: classifyProviderError(error),
          }).message,
        );
      }
    }

    if (!attemptedStructuredProvider && skippedForCooldownOnly) {
      throw new AppError(
        503,
        'AI_PROVIDER_COOLDOWN',
        'AI provider đang tạm nghỉ sau nhiều lỗi gần đây. Hãy thử lại sau ít phút hoặc chuyển provider khác.',
        structuredWarnings,
      );
    }

    if (!input.legacyFallback) {
      throw new AppError(
        500,
        'STRUCTURED_OUTPUT_FAILED',
        'Structured output path failed for all available providers.',
        structuredWarnings,
      );
    }

    let attemptedLegacyProvider = false;
    for (const [index, providerState] of candidates.entries()) {
      const availability = this.providerHealthService.canAttempt(providerState.key);
      if (!availability.allowed) {
        continue;
      }

      attemptedLegacyProvider = true;

      try {
        const result = await this.attemptProvider({
          userId: input.userId,
          sessionId: input.sessionId,
          messageId: input.messageId,
          providerKey: providerState.key,
          model: providerState.model,
          timeoutMs: providerState.timeoutMs,
          maxRetries: providerState.maxRetries,
          systemPrompt: input.legacyFallback.systemPrompt,
          messages: input.legacyFallback.messages,
          parseText: input.legacyFallback.parse,
          mode: 'legacy',
          providerFallbackUsed: index > 0,
        });
        return {
          ...result,
          warnings: [...structuredWarnings, ...result.warnings],
        };
      } catch (error) {
        structuredWarnings.push(
          buildProviderFailureNotice({
            provider: providerState.key,
            language: warningLanguage,
            descriptor: classifyProviderError(error),
          }).message,
        );
      }
    }

    if (!attemptedLegacyProvider && skippedForCooldownOnly) {
      throw new AppError(
        503,
        'AI_PROVIDER_COOLDOWN',
        'AI provider đang tạm nghỉ sau nhiều lỗi gần đây. Hãy thử lại sau ít phút hoặc chuyển provider khác.',
        structuredWarnings,
      );
    }

    throw new AppError(
      500,
      'STRUCTURED_OUTPUT_AND_FALLBACK_FAILED',
      'Không thể tạo structured output đáng tin cậy từ nội dung này.',
      structuredWarnings,
    );
  }
}
