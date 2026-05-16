import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_PROVIDER,
  EXTERNAL_PROVIDER_KEYS,
  FALLBACK_PROVIDER,
  PROVIDER_DEFAULT_MODELS,
  type ExternalProviderKey,
  type ProviderKey,
} from '@chatbot-ai/shared';
import { parse } from 'dotenv';
import { z } from 'zod';
import { resolveEnvPaths } from './env-paths';

const envDir = path.dirname(fileURLToPath(import.meta.url));
const { apiEnvPath, rootEnvPath } = resolveEnvPaths(envDir);

const loadEnvFile = (targetPath: string) => {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  const parsedFile = parse(fs.readFileSync(targetPath));
  Object.entries(parsedFile).forEach(([key, value]) => {
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  });
};

// Precedence: shell env > apps/api/.env > repo-root .env fallback.
loadEnvFile(apiEnvPath);
if (rootEnvPath) {
  loadEnvFile(rootEnvPath);
}

const booleanish = z
  .string()
  .optional()
  .transform((value) => value === 'true');

const externalProviderKeySchema = z.enum(EXTERNAL_PROVIDER_KEYS);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1000).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  CLIENT_ORIGIN: z
    .string()
    .default(
      'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174',
    ),
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).default(30),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_ENABLED: booleanish.default('true'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().min(5000).default(25000),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.4-mini'),
  OPENAI_ENABLED: booleanish.default('true'),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().min(5000).default(25000),
  LOCAL_LORA_ENABLED: booleanish.default('false'),
  LOCAL_LORA_BASE_URL: z.string().default('http://localhost:8008'),
  LOCAL_LORA_MODEL: z.string().default('local-lora-tutor-v1'),
  LOCAL_LORA_TIMEOUT_MS: z.coerce.number().int().default(30000),
  LOCAL_LORA_MAX_NEW_TOKENS: z.coerce.number().int().min(16).max(512).default(64),
  LOCAL_LORA_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  LOCAL_LORA_TOP_P: z.coerce.number().min(0.1).max(1).default(0.9),
  LOCAL_LORA_CONTEXT_MAX_CHARS: z.coerce.number().int().min(500).max(20000).default(6000),
  AI_PRIMARY_PROVIDER: externalProviderKeySchema.optional(),
  AI_FALLBACK_PROVIDER: externalProviderKeySchema.optional(),
  AI_MAX_CONTEXT_MESSAGES: z.coerce.number().int().min(4).max(30).default(10),
  AI_MAX_PROMPT_CHARS: z.coerce.number().int().min(1000).default(12000),
  AI_REQUEST_RETRY_COUNT: z.coerce.number().int().min(0).max(3).default(1),
  AI_PROVIDER_FAILURE_THRESHOLD: z.coerce.number().int().min(1).max(10).default(3),
  AI_PROVIDER_COOLDOWN_MS: z.coerce.number().int().min(30_000).max(600_000).default(90_000),
  AI_LOCAL_FALLBACK_ENABLED: booleanish.default('true'),
  AI_STARTUP_STRICT: booleanish.default('false'),
  L3_ALLOW_EXTERNAL_FALLBACK: booleanish.default('false'),
  L3_INTERNAL_MODEL_NAME: z.string().trim().min(1).default(PROVIDER_DEFAULT_MODELS.internal_l3_tutor),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

const isProduction = parsed.data.NODE_ENV === 'production';
const isJwtPlaceholder =
  parsed.data.JWT_SECRET === 'replace-with-a-long-random-secret-at-least-32-characters';

if (isProduction && isJwtPlaceholder) {
  console.error(
    'FATAL: JWT_SECRET is set to the placeholder value. ' +
    'Generate a strong secret (at least 32 random characters) and set it as JWT_SECRET in your environment.',
  );
  throw new Error('JWT_SECRET must be set to a non-placeholder value in production');
}

const normalizeOptionalSecret = (value?: string) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : '';
};

export const env = {
  ...parsed.data,
  GEMINI_API_KEY: normalizeOptionalSecret(parsed.data.GEMINI_API_KEY),
  GEMINI_MODEL: parsed.data.GEMINI_MODEL || PROVIDER_DEFAULT_MODELS.GEMINI,
  OPENAI_API_KEY: normalizeOptionalSecret(parsed.data.OPENAI_API_KEY),
  OPENAI_MODEL: parsed.data.OPENAI_MODEL || PROVIDER_DEFAULT_MODELS.OPENAI,
  AI_PRIMARY_PROVIDER: parsed.data.AI_PRIMARY_PROVIDER ?? DEFAULT_PROVIDER,
  AI_FALLBACK_PROVIDER:
    (parsed.data.AI_FALLBACK_PROVIDER ?? FALLBACK_PROVIDER) ===
    (parsed.data.AI_PRIMARY_PROVIDER ?? DEFAULT_PROVIDER)
      ? ([...EXTERNAL_PROVIDER_KEYS].find(
          (provider) => provider !== (parsed.data.AI_PRIMARY_PROVIDER ?? DEFAULT_PROVIDER),
        ) as ExternalProviderKey)
      : (parsed.data.AI_FALLBACK_PROVIDER ?? FALLBACK_PROVIDER),
  clientOrigins: parsed.data.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()),
};

export interface AIStartupIssue {
  provider?: ProviderKey;
  severity: 'warning' | 'error';
  code:
    | 'PROVIDER_ENABLED_MISSING_KEY'
    | 'ALL_PROVIDERS_DISABLED'
    | 'NO_CONFIGURED_PROVIDER'
    | 'LOCAL_FALLBACK_DISABLED_NO_PROVIDER';
  message: string;
}

export const getAIStartupIssues = (): AIStartupIssue[] => {
  const issues: AIStartupIssue[] = [];
  const providerEnv = [
    {
      provider: 'GEMINI' as const,
      enabled: env.GEMINI_ENABLED,
      configured: Boolean(env.GEMINI_API_KEY),
    },
    {
      provider: 'OPENAI' as const,
      enabled: env.OPENAI_ENABLED,
      configured: Boolean(env.OPENAI_API_KEY),
    },
    {
      provider: 'local_lora' as const,
      enabled: env.LOCAL_LORA_ENABLED,
      configured: true, // Local provider doesn't strictly need API keys
    },
  ];
  const enabledProviders = providerEnv.filter((provider) => provider.enabled);
  const configuredProviders = enabledProviders.filter((provider) => provider.configured);

  enabledProviders
    .filter((provider) => !provider.configured)
    .forEach((provider) => {
      issues.push({
        provider: provider.provider,
        severity: env.AI_STARTUP_STRICT ? 'error' : 'warning',
        code: 'PROVIDER_ENABLED_MISSING_KEY',
        message: `${provider.provider} đang bật nhưng chưa có API key hợp lệ.`,
      });
    });

  if (enabledProviders.length === 0) {
    issues.push({
      severity: env.AI_LOCAL_FALLBACK_ENABLED ? 'warning' : 'error',
      code: 'ALL_PROVIDERS_DISABLED',
      message: env.AI_LOCAL_FALLBACK_ENABLED
        ? 'Cả Gemini và OpenAI đều đang tắt; hệ thống chỉ còn chạy bằng local fallback.'
        : 'Cả Gemini và OpenAI đều đang tắt và local fallback cũng không thể thay thế provider thật.',
    });
  }

  if (enabledProviders.length > 0 && configuredProviders.length === 0) {
    issues.push({
      severity:
        env.AI_STARTUP_STRICT || !env.AI_LOCAL_FALLBACK_ENABLED ? 'error' : 'warning',
      code: 'NO_CONFIGURED_PROVIDER',
      message: env.AI_LOCAL_FALLBACK_ENABLED
        ? 'Chưa có provider AI thật nào sẵn sàng; hệ thống sẽ phải dùng local fallback.'
        : 'Chưa có provider AI thật nào sẵn sàng và local fallback đang tắt.',
    });
  }

  if (configuredProviders.length === 0 && !env.AI_LOCAL_FALLBACK_ENABLED) {
    issues.push({
      severity: 'error',
      code: 'LOCAL_FALLBACK_DISABLED_NO_PROVIDER',
      message: 'Không có provider AI thật nào khả dụng trong khi local fallback đang tắt.',
    });
  }

  return issues;
};
