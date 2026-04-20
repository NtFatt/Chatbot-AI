import type { ProviderKey } from '@chatbot-ai/shared';
import { DEFAULT_PROVIDER, FALLBACK_PROVIDER, PROVIDER_DEFAULT_MODELS } from '@chatbot-ai/shared';

import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import type { AIProvider } from '../../integrations/ai/ai.types';

export interface ProviderDescriptor {
  key: ProviderKey;
  enabled: boolean;
  configured: boolean;
  isPrimary: boolean;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface ProviderConnectivityDescriptor extends ProviderDescriptor {
  status: 'ready' | 'missing_key' | 'disabled' | 'error';
  message: string;
  checkedAt: string;
  latencyMs: number | null;
}

export class ProvidersService {
  async listProviders() {
    const dbConfigs = await prisma.aiProviderConfig.findMany();
    const byKey = new Map(dbConfigs.map((item) => [item.provider, item]));

    const geminiConfigured = Boolean(env.GEMINI_API_KEY) && env.GEMINI_ENABLED;
    const openaiConfigured = Boolean(env.OPENAI_API_KEY) && env.OPENAI_ENABLED;

    const providers = [
      {
        key: 'GEMINI' as const,
        enabled: byKey.get('GEMINI')?.enabled ?? true,
        configured: geminiConfigured,
        isPrimary: byKey.get('GEMINI')?.isPrimary ?? DEFAULT_PROVIDER === 'GEMINI',
        model: byKey.get('GEMINI')?.model ?? env.GEMINI_MODEL ?? PROVIDER_DEFAULT_MODELS.GEMINI,
        timeoutMs: byKey.get('GEMINI')?.timeoutMs ?? env.GEMINI_TIMEOUT_MS,
        maxRetries: byKey.get('GEMINI')?.maxRetries ?? env.AI_REQUEST_RETRY_COUNT,
      },
      {
        key: 'OPENAI' as const,
        enabled: byKey.get('OPENAI')?.enabled ?? true,
        configured: openaiConfigured,
        isPrimary: byKey.get('OPENAI')?.isPrimary ?? DEFAULT_PROVIDER === 'OPENAI',
        model: byKey.get('OPENAI')?.model ?? env.OPENAI_MODEL ?? PROVIDER_DEFAULT_MODELS.OPENAI,
        timeoutMs: byKey.get('OPENAI')?.timeoutMs ?? env.OPENAI_TIMEOUT_MS,
        maxRetries: byKey.get('OPENAI')?.maxRetries ?? env.AI_REQUEST_RETRY_COUNT,
      },
    ] satisfies ProviderDescriptor[];

    const normalizedProviders: ProviderDescriptor[] = providers.map((provider) => ({
      ...provider,
      enabled: provider.enabled && provider.configured,
    }));

    const primary = normalizedProviders.find((provider) => provider.isPrimary && provider.enabled)?.key;

    return {
      defaultProvider:
        primary ??
        normalizedProviders.find((provider) => provider.key === DEFAULT_PROVIDER && provider.enabled)?.key ??
        normalizedProviders.find((provider) => provider.enabled)?.key ??
        FALLBACK_PROVIDER,
      fallbackProvider:
        normalizedProviders.find((provider) => provider.key === FALLBACK_PROVIDER && provider.enabled)?.key ??
        normalizedProviders.find((provider) => provider.key !== primary && provider.enabled)?.key ??
        null,
      providers: normalizedProviders,
    };
  }

  async diagnoseProviders(providersMap: Record<ProviderKey, AIProvider | null>) {
    const providerState = await this.listProviders();
    const checkedAt = new Date().toISOString();

    const providers = await Promise.all(
      providerState.providers.map(async (provider): Promise<ProviderConnectivityDescriptor> => {
        if (!provider.configured) {
          return {
            ...provider,
            status: 'missing_key',
            message: 'Chưa có API key trên server cho provider này.',
            checkedAt,
            latencyMs: null,
          };
        }

        if (!provider.enabled) {
          return {
            ...provider,
            status: 'disabled',
            message: 'Provider đã bị tắt trong cấu hình vận hành.',
            checkedAt,
            latencyMs: null,
          };
        }

        const client = providersMap[provider.key];
        if (!client) {
          return {
            ...provider,
            status: 'missing_key',
            message: 'Server chưa khởi tạo client cho provider này.',
            checkedAt,
            latencyMs: null,
          };
        }

        try {
          const response = await client.generate({
            provider: provider.key,
            model: provider.model,
            systemPrompt:
              'You are running a provider health check for a study assistant application. Reply with exactly READY.',
            messages: [
              {
                role: 'user',
                content: 'Reply with exactly READY if the provider is reachable.',
              },
            ],
            timeoutMs: Math.min(provider.timeoutMs, 10_000),
          });

          if (!response.text.trim()) {
            throw new Error('EMPTY_PROVIDER_HEALTH_RESPONSE');
          }

          return {
            ...provider,
            status: 'ready',
            message: 'Provider đã sẵn sàng để xử lý câu hỏi học tập thực tế.',
            checkedAt,
            latencyMs: response.latencyMs,
          };
        } catch (error) {
          const rawMessage = error instanceof Error ? error.message : 'UNKNOWN_PROVIDER_ERROR';
          const normalizedMessage =
            rawMessage === 'GEMINI_TIMEOUT'
              ? 'Provider phản hồi quá chậm hoặc đang không khả dụng.'
              : `Không thể dùng provider ngay lúc này: ${rawMessage}`;

          return {
            ...provider,
            status: 'error',
            message: normalizedMessage,
            checkedAt,
            latencyMs: null,
          };
        }
      }),
    );

    return {
      ...providerState,
      checkedAt,
      realAiAvailable: providers.some((provider) => provider.status === 'ready'),
      providers,
    };
  }
}
