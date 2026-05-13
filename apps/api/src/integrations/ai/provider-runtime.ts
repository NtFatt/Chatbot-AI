import type {
  AIFallbackCategory,
  AIFallbackNotice,
  AppLanguage,
  ProviderKey,
} from '@chatbot-ai/shared';

import type { ProviderDescriptor } from '../../modules/providers/providers.service';
import type { AIProviderErrorDescriptor } from './ai.types';

export const classifyProviderError = (error: unknown): AIProviderErrorDescriptor => {
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
    normalized.includes('SAFETY') ||
    normalized.includes('SCHEMA') ||
    normalized.includes('VALIDATION')
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

export const isConfigurationError = (descriptor: AIProviderErrorDescriptor | null) =>
  Boolean(
    descriptor &&
      (descriptor.code.includes('API_KEY') ||
        descriptor.code.includes('AUTH') ||
        descriptor.code.includes('UNAUTHORIZED') ||
        descriptor.code.includes('INVALID_MODEL') ||
        descriptor.code.includes('MALFORMED')),
  );

const providerLabelMap: Record<ProviderKey, string> = {
  GEMINI: 'Gemini',
  OPENAI: 'OpenAI',
  internal_l3_tutor: 'Internal L3 Tutor',
};

const joinLocalized = (language: AppLanguage, vi: string, en: string) => {
  if (language === 'en') {
    return en;
  }

  if (language === 'bilingual') {
    return `${vi} / ${en}`;
  }

  return vi;
};

const formatRetryWindow = (language: AppLanguage, seconds: number) =>
  joinLocalized(
    language,
    `Thử lại sau khoảng ${seconds} giây.`,
    `Try again in about ${seconds} seconds.`,
  );

export const extractRetryAfterSeconds = (message: string): number | null => {
  const patterns = [
    /retry(?:\s+again)?(?:\s+in|\s+after)?\s+(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/i,
    /retrydelay["':=\s]+(\d+(?:\.\d+)?)s\b/i,
    /cooldown(?:\s+remaining)?["':=\s]+(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(message);
    if (match) {
      return Math.max(1, Math.ceil(Number(match[1])));
    }
  }

  return null;
};

export const classifyFallbackCategory = (
  descriptor: AIProviderErrorDescriptor | null,
): Exclude<
  AIFallbackCategory,
  'cooldown_active' | 'secondary_provider_used' | 'local_fallback_used'
> => {
  if (!descriptor) {
    return 'provider_unavailable';
  }

  const normalized = `${descriptor.code} ${descriptor.message}`.toUpperCase();

  if (isConfigurationError(descriptor) || normalized.includes('API_KEY_INVALID') || normalized.includes('EXPIRED')) {
    return 'missing_credentials';
  }

  if (
    normalized.includes('RESOURCE_EXHAUSTED') ||
    normalized.includes('QUOTA') ||
    normalized.includes('FREE_TIER') ||
    normalized.includes('FREE TIER') ||
    normalized.includes('EXCEEDED')
  ) {
    return 'quota_exhausted';
  }

  if (
    normalized.includes('RATE_LIMIT') ||
    normalized.includes('TOO MANY REQUESTS') ||
    normalized.includes('TOO_MANY_REQUESTS') ||
    normalized.includes('429')
  ) {
    return 'rate_limited';
  }

  if (
    normalized.includes('503') ||
    normalized.includes('502') ||
    normalized.includes('SERVICE UNAVAILABLE') ||
    normalized.includes('SERVICE_UNAVAILABLE') ||
    normalized.includes('UNAVAILABLE') ||
    normalized.includes('OVERLOADED')
  ) {
    return 'service_unavailable';
  }

  return 'provider_unavailable';
};

export const buildFallbackNotice = (input: {
  category: AIFallbackCategory;
  language: AppLanguage;
  provider?: ProviderKey | null;
  fallbackProvider?: ProviderKey | null;
  retryAfterSeconds?: number | null;
  cooldownRemainingMs?: number | null;
}): AIFallbackNotice => {
  const providerLabel = input.provider ? providerLabelMap[input.provider] : null;
  const fallbackProviderLabel = input.fallbackProvider
    ? providerLabelMap[input.fallbackProvider]
    : null;
  const retryAfterSeconds =
    input.retryAfterSeconds ??
    (input.cooldownRemainingMs != null && input.cooldownRemainingMs > 0
      ? Math.max(1, Math.ceil(input.cooldownRemainingMs / 1000))
      : null);

  const retrySuffix = retryAfterSeconds ? ` ${formatRetryWindow(input.language, retryAfterSeconds)}` : '';

  switch (input.category) {
    case 'quota_exhausted':
      return {
        category: input.category,
        provider: input.provider ?? null,
        retryAfterSeconds,
        temporary: true,
        message: joinLocalized(
          input.language,
          `${providerLabel ?? 'Provider'} đã vượt giới hạn lượt gọi hiện tại.${retrySuffix}`.trim(),
          `${providerLabel ?? 'The provider'} has reached its current usage limit.${retrySuffix}`.trim(),
        ),
      };
    case 'rate_limited':
      return {
        category: input.category,
        provider: input.provider ?? null,
        retryAfterSeconds,
        temporary: true,
        message: joinLocalized(
          input.language,
          `${providerLabel ?? 'Provider'} tạm thời bị giới hạn lượt gọi.${retrySuffix}`.trim(),
          `${providerLabel ?? 'The provider'} is temporarily rate-limited.${retrySuffix}`.trim(),
        ),
      };
    case 'service_unavailable':
      return {
        category: input.category,
        provider: input.provider ?? null,
        retryAfterSeconds,
        temporary: true,
        message: joinLocalized(
          input.language,
          `${providerLabel ?? 'Provider'} đang tạm thời không sẵn sàng.${retrySuffix}`.trim(),
          `${providerLabel ?? 'The provider'} is temporarily unavailable.${retrySuffix}`.trim(),
        ),
      };
    case 'cooldown_active':
      return {
        category: input.category,
        provider: input.provider ?? null,
        cooldownRemainingMs: input.cooldownRemainingMs ?? null,
        retryAfterSeconds,
        temporary: true,
        message: joinLocalized(
          input.language,
          `${providerLabel ?? 'Provider'} đang tạm nghỉ sau nhiều lỗi gần đây.${retrySuffix}`.trim(),
          `${providerLabel ?? 'The provider'} is cooling down after recent failures.${retrySuffix}`.trim(),
        ),
      };
    case 'missing_credentials':
      return {
        category: input.category,
        provider: input.provider ?? null,
        temporary: false,
        message: joinLocalized(
          input.language,
          `${providerLabel ?? 'Provider'} chưa có cấu hình hợp lệ trên server.`,
          `${providerLabel ?? 'The provider'} is not configured correctly on the server.`,
        ),
      };
    case 'provider_unavailable':
      return {
        category: input.category,
        provider: input.provider ?? null,
        retryAfterSeconds,
        temporary: true,
        message: joinLocalized(
          input.language,
          `${providerLabel ?? 'Provider'} hiện chưa thể phản hồi.${retrySuffix}`.trim(),
          `${providerLabel ?? 'The provider'} cannot respond right now.${retrySuffix}`.trim(),
        ),
      };
    case 'secondary_provider_used':
      return {
        category: input.category,
        provider: input.provider ?? null,
        fallbackProvider: input.fallbackProvider ?? null,
        temporary: true,
        message: joinLocalized(
          input.language,
          `${fallbackProviderLabel ?? 'Một provider khác'} đã được dùng để trả lời thay cho ${providerLabel ?? 'provider chính'}.`,
          `${fallbackProviderLabel ?? 'Another provider'} answered instead of ${providerLabel ?? 'the primary provider'}.`,
        ),
      };
    case 'local_fallback_used':
      return {
        category: input.category,
        provider: input.provider ?? null,
        temporary: true,
        message: joinLocalized(
          input.language,
          'Không có AI bên ngoài khả dụng. Hệ thống đang dùng chế độ trợ lý học tập cục bộ.',
          'No external AI provider is available. The app is using its local study assistant.',
        ),
      };
  }
};

export const buildCooldownNotice = (input: {
  provider: ProviderKey;
  language: AppLanguage;
  cooldownRemainingMs: number;
}) =>
  buildFallbackNotice({
    category: 'cooldown_active',
    language: input.language,
    provider: input.provider,
    cooldownRemainingMs: input.cooldownRemainingMs,
  });

export const buildProviderFailureNotice = (input: {
  provider: ProviderKey;
  language: AppLanguage;
  descriptor: AIProviderErrorDescriptor | null;
}): AIFallbackNotice => {
  const category = classifyFallbackCategory(input.descriptor);
  return buildFallbackNotice({
    category,
    language: input.language,
    provider: input.provider,
    retryAfterSeconds: input.descriptor ? extractRetryAfterSeconds(input.descriptor.message) : null,
  });
};

export const buildSecondaryProviderNotice = (input: {
  language: AppLanguage;
  failedProvider: ProviderKey;
  answeredBy: ProviderKey;
}) =>
  buildFallbackNotice({
    category: 'secondary_provider_used',
    language: input.language,
    provider: input.failedProvider,
    fallbackProvider: input.answeredBy,
  });

export const buildLocalFallbackNotice = (input: {
  language: AppLanguage;
  provider?: ProviderKey | null;
}) =>
  buildFallbackNotice({
    category: 'local_fallback_used',
    language: input.language,
    provider: input.provider ?? null,
  });

export const orderProviderCandidates = (
  available: ProviderDescriptor[],
  requestedProvider: ProviderKey | undefined,
  sessionProvider: ProviderKey,
  defaultProvider: ProviderKey,
  fallbackProvider: ProviderKey | null,
) => {
  const order = [requestedProvider, sessionProvider, defaultProvider, fallbackProvider].filter(
    (item): item is ProviderKey => Boolean(item),
  );

  return Array.from(new Set(order)).flatMap((key) =>
    available.filter((provider) => provider.key === key && provider.enabled && provider.configured),
  );
};
