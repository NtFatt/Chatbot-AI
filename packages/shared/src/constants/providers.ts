export const PROVIDER_KEYS = ['GEMINI', 'OPENAI'] as const;

export type ProviderKey = (typeof PROVIDER_KEYS)[number];
export const PROVIDER_RUNTIME_STATUSES = [
  'ready',
  'missing_key',
  'disabled',
  'error',
  'cooldown',
] as const;
export type ProviderRuntimeStatus = (typeof PROVIDER_RUNTIME_STATUSES)[number];
export const PROVIDER_HEALTH_STATES = ['healthy', 'cooldown', 'degraded'] as const;
export type ProviderHealthState = (typeof PROVIDER_HEALTH_STATES)[number];

export const PROVIDER_LABELS: Record<ProviderKey, { vi: string; en: string }> = {
  GEMINI: {
    vi: 'Google Gemini',
    en: 'Google Gemini',
  },
  OPENAI: {
    vi: 'OpenAI',
    en: 'OpenAI',
  },
};

export const DEFAULT_PROVIDER: ProviderKey = 'GEMINI';
export const FALLBACK_PROVIDER: ProviderKey = 'OPENAI';

export const PROVIDER_DEFAULT_MODELS: Record<ProviderKey, string> = {
  GEMINI: 'gemini-2.5-flash',
  OPENAI: 'gpt-5.4-mini',
};
