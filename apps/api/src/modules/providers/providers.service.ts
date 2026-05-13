import type {
  ProviderHealthState,
  ExternalProviderKey,
  ProviderKey,
  ProviderRuntimeStatus,
} from '@chatbot-ai/shared';
import {
  DEFAULT_PROVIDER,
  EXTERNAL_PROVIDER_KEYS,
  FALLBACK_PROVIDER,
  PROVIDER_DEFAULT_MODELS,
} from '@chatbot-ai/shared';

import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import type { AIProvider } from '../../integrations/ai/ai.types';
import { ProviderHealthService } from '../../integrations/ai/provider-health.service';
import type { ModelRegistryService } from '../model-registry/model-registry.service';

type RuntimeSource = 'db' | 'env' | 'default';

export interface ProviderDescriptor {
  key: ExternalProviderKey;
  enabled: boolean;
  configured: boolean;
  isPrimary: boolean;
  model: string;
  modelVersionId: string | null;
  timeoutMs: number;
  maxRetries: number;
  healthState: ProviderHealthState;
  cooldownRemainingMs: number;
  runtimeSource: RuntimeSource;
}

export interface ProviderConnectivityDescriptor extends ProviderDescriptor {
  status: ProviderRuntimeStatus;
  message: string;
  checkedAt: string;
  latencyMs: number | null;
}

const providerKeyToEnv = (provider: ExternalProviderKey) =>
  provider === 'GEMINI'
    ? {
        apiKey: env.GEMINI_API_KEY,
        enabled: env.GEMINI_ENABLED,
        model: env.GEMINI_MODEL,
        timeoutMs: env.GEMINI_TIMEOUT_MS,
      }
    : {
        apiKey: env.OPENAI_API_KEY,
        enabled: env.OPENAI_ENABLED,
        model: env.OPENAI_MODEL,
        timeoutMs: env.OPENAI_TIMEOUT_MS,
      };

export class ProvidersService {
  constructor(
    private readonly providerHealthService: ProviderHealthService,
    private readonly modelRegistryService?: ModelRegistryService,
  ) {}

  private async readDescriptors() {
    const dbConfigs = await prisma.aiProviderConfig.findMany();
    const byKey = new Map(dbConfigs.map((item) => [item.provider as ProviderKey, item]));

    const providers = await Promise.all(EXTERNAL_PROVIDER_KEYS.map(async (key) => {
      const envConfig = providerKeyToEnv(key);
      const dbConfig = byKey.get(key);
      const health = this.providerHealthService.snapshot(key);
      const envApiKey = envConfig.apiKey.trim();
      const activeModel = await this.modelRegistryService?.getActiveModelForRuntime(key);

      return {
        key,
        enabled: dbConfig?.enabled ?? envConfig.enabled ?? true,
        configured: envApiKey.length > 0,
        isPrimary: dbConfig?.isPrimary ?? env.AI_PRIMARY_PROVIDER === key,
        model:
          activeModel?.model ??
          dbConfig?.model ??
          envConfig.model ??
          PROVIDER_DEFAULT_MODELS[key],
        modelVersionId: activeModel?.modelVersionId ?? null,
        timeoutMs: dbConfig?.timeoutMs ?? envConfig.timeoutMs ?? 25_000,
        maxRetries: dbConfig?.maxRetries ?? env.AI_REQUEST_RETRY_COUNT,
        healthState: health.state,
        cooldownRemainingMs: health.cooldownRemainingMs,
        runtimeSource: dbConfig
          ? 'db'
          : envConfig.model || envConfig.enabled
            ? 'env'
            : 'default',
      } satisfies ProviderDescriptor;
    }));

    return providers;
  }

  private resolveProviderOrder(
    providers: ProviderDescriptor[],
    preferred: ExternalProviderKey | null | undefined,
    fallback: ExternalProviderKey | null | undefined,
  ) {
    const availableProviders = providers.filter((provider) => provider.enabled && provider.configured);
    const availableKeys = new Set(availableProviders.map((provider) => provider.key));

    const defaultProvider =
      [preferred, env.AI_PRIMARY_PROVIDER, DEFAULT_PROVIDER]
        .filter((candidate): candidate is ExternalProviderKey => Boolean(candidate))
        .find((candidate) => availableKeys.has(candidate)) ??
      availableProviders[0]?.key ??
      env.AI_PRIMARY_PROVIDER;

    const fallbackProvider =
      [fallback, env.AI_FALLBACK_PROVIDER, FALLBACK_PROVIDER]
        .filter(
          (candidate): candidate is ExternalProviderKey =>
            Boolean(candidate) && candidate !== defaultProvider,
        )
        .find((candidate) => availableKeys.has(candidate)) ??
      availableProviders.find((provider) => provider.key !== defaultProvider)?.key ??
      null;

    return {
      defaultProvider,
      fallbackProvider,
    };
  }

  async listProviders() {
    const providers = await this.readDescriptors();
    const resolved = this.resolveProviderOrder(providers, providers.find((provider) => provider.isPrimary)?.key, env.AI_FALLBACK_PROVIDER);

    return {
      ...resolved,
      providers,
      localFallbackEnabled: env.AI_LOCAL_FALLBACK_ENABLED,
    };
  }

  async diagnoseProviders(
  providersMap: Partial<Record<ProviderKey, AIProvider | null>>,
  requestedProvider?: ExternalProviderKey,
  ) {
    const providerState = await this.listProviders();
    const checkedAt = new Date().toISOString();
    const selectedProviders = requestedProvider
      ? providerState.providers.filter((provider) => provider.key === requestedProvider)
      : providerState.providers;

    const providers = await Promise.all(
      selectedProviders.map(async (provider): Promise<ProviderConnectivityDescriptor> => {
        if (!provider.enabled) {
          return {
            ...provider,
            status: 'disabled',
            message: 'Provider đã bị tắt trong cấu hình vận hành.',
            checkedAt,
            latencyMs: null,
          };
        }

        if (!provider.configured) {
          return {
            ...provider,
            status: 'missing_key',
            message: 'Provider chưa có API key hợp lệ trên server.',
            checkedAt,
            latencyMs: null,
          };
        }

        const health = this.providerHealthService.snapshot(provider.key);
        if (!health.available) {
          return {
            ...provider,
            status: 'cooldown',
            message: `Provider đang trong thời gian làm nguội sau chuỗi lỗi gần đây. Còn khoảng ${Math.ceil(
              health.cooldownRemainingMs / 1000,
            )} giây trước khi thử lại.`,
            checkedAt,
            latencyMs: null,
          };
        }

        const client = providersMap[provider.key];
        if (!client) {
          return {
            ...provider,
            status: 'missing_key',
            message: 'Server chưa khởi tạo được client tương ứng cho provider này.',
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
            message: 'Provider đang sẵn sàng cho các phiên hỏi đáp học tập.',
            checkedAt,
            latencyMs: response.latencyMs,
          };
        } catch (error) {
          const rawMessage = error instanceof Error ? error.message : 'UNKNOWN_PROVIDER_ERROR';
          return {
            ...provider,
            status: 'error',
            message: `Provider chưa vượt qua bài test kết nối: ${rawMessage}`,
            checkedAt,
            latencyMs: null,
          };
        }
      }),
    );

    const resolved = this.resolveProviderOrder(
      providerState.providers,
      providerState.defaultProvider,
      providerState.fallbackProvider,
    );

    return {
      ...resolved,
      checkedAt,
      localFallbackEnabled: providerState.localFallbackEnabled,
      realAiAvailable: providers.some((provider) => provider.status === 'ready'),
      providers,
    };
  }
}
