import type { ProviderKey } from '@chatbot-ai/shared';

import { env } from '../../config/env';
import { UsageService } from '../../modules/usage/usage.service';
import { ProvidersService } from '../../modules/providers/providers.service';
import { AppError } from '../../utils/errors';
import type { AIConversationMessage, AIProvider, LocalLoraTaskCategory } from './ai.types';
import { ProviderHealthService } from './provider-health.service';
import { classifyProviderError } from './provider-runtime';

export interface ModelGatewayResponse {
  provider: ProviderKey;
  model: string;
  modelVersionId: string | null;
  providerRequestId?: string;
  text: string;
  finishReason: 'stop' | 'length' | 'error' | 'unknown';
  latencyMs: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export class ModelGatewayService {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly providers: Partial<Record<ProviderKey, AIProvider | null>>,
    private readonly providerHealthService: ProviderHealthService,
    private readonly usageService: UsageService,
  ) {}

  async generateSingle(input: {
    provider: ProviderKey;
    model?: string;
    modelVersionId?: string | null;
    temperature?: number;
    topP?: number;
    maxNewTokens?: number;
    contextMaxChars?: number;
    taskCategory?: LocalLoraTaskCategory | null;
    timeoutMs?: number;
    userId?: string;
    sessionId?: string | null;
    messageId?: string | null;
    systemPrompt: string;
    messages: AIConversationMessage[];
  }): Promise<ModelGatewayResponse> {
    const providerState =
      input.provider === 'local_lora'
        ? {
            key: 'local_lora' as const,
            enabled: env.LOCAL_LORA_ENABLED,
            configured: true,
            model: input.model ?? env.LOCAL_LORA_MODEL,
            modelVersionId: input.modelVersionId ?? null,
            timeoutMs: env.LOCAL_LORA_TIMEOUT_MS,
          }
        : (await this.providersService.listProviders()).providers.find((item) => item.key === input.provider);

    if (!providerState || !providerState.enabled || !providerState.configured) {
      throw new AppError(503, 'MODEL_PROVIDER_UNAVAILABLE', 'Requested model provider is not available.');
    }

    const availability = this.providerHealthService.canAttempt(providerState.key);
    if (!availability.allowed) {
      throw new AppError(
        503,
        'MODEL_PROVIDER_COOLDOWN',
        `Requested provider is cooling down for another ${Math.ceil(availability.cooldownRemainingMs / 1000)} seconds.`,
      );
    }

    const client = this.providers[input.provider];
    if (!client) {
      throw new AppError(503, 'MODEL_PROVIDER_CLIENT_MISSING', 'Requested provider client is not initialized.');
    }

    const model = input.model ?? providerState.model;

    try {
      const response = await client.generate({
        provider: input.provider,
        model,
        systemPrompt: input.systemPrompt,
        messages: input.messages,
        timeoutMs: input.timeoutMs ?? providerState.timeoutMs,
        temperature: input.temperature,
        topP: input.topP,
        maxNewTokens: input.maxNewTokens,
        contextMaxChars: input.contextMaxChars,
        taskCategory: input.taskCategory,
      });

      this.providerHealthService.recordSuccess(input.provider);
      if (input.userId && input.sessionId) {
        await this.usageService.recordUsage({
          userId: input.userId,
          sessionId: input.sessionId,
          messageId: input.messageId,
          provider: input.provider,
          model,
          inputTokens: response.usage?.inputTokens,
          outputTokens: response.usage?.outputTokens,
          totalTokens: response.usage?.totalTokens,
          latencyMs: response.latencyMs,
          success: true,
          fallbackUsed: false,
        });
      }

      return {
        provider: input.provider,
        model,
        modelVersionId: input.modelVersionId ?? providerState.modelVersionId ?? null,
        providerRequestId: response.providerRequestId,
        text: response.text,
        finishReason: response.finishReason,
        latencyMs: response.latencyMs,
        usage: response.usage,
      };
    } catch (error) {
      const classified = classifyProviderError(error);
      this.providerHealthService.recordFailure({
        provider: input.provider,
        code: classified.code,
        message: classified.message,
        retryable: classified.retryable,
      });
      await this.usageService.recordIncident({
        provider: input.provider,
        model,
        errorCode: classified.code,
        errorMessage: classified.message,
        retryable: classified.retryable,
      });
      if (input.userId && input.sessionId) {
        await this.usageService.recordUsage({
          userId: input.userId,
          sessionId: input.sessionId,
          messageId: input.messageId,
          provider: input.provider,
          model,
          latencyMs: 0,
          success: false,
          fallbackUsed: false,
        });
      }

      throw new AppError(502, 'MODEL_GATEWAY_GENERATION_FAILED', classified.message);
    }
  }
}
