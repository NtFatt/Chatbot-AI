export const EXTERNAL_PROVIDER_KEYS = ['GEMINI', 'OPENAI'] as const;
export const INTERNAL_PROVIDER_KEYS = ['internal_l3_tutor', 'local_lora'] as const;
export const PROVIDER_KEYS = [...EXTERNAL_PROVIDER_KEYS, ...INTERNAL_PROVIDER_KEYS] as const;

export type ExternalProviderKey = (typeof EXTERNAL_PROVIDER_KEYS)[number];
export type InternalProviderKey = (typeof INTERNAL_PROVIDER_KEYS)[number];
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
  internal_l3_tutor: {
    vi: 'AI học tập Level 3',
    en: 'Internal L3 Tutor',
  },
  local_lora: {
    vi: 'Local LoRA Tutor',
    en: 'Low L4 Tutor',
  },
};

export const DEFAULT_PROVIDER: ExternalProviderKey = 'GEMINI';
export const FALLBACK_PROVIDER: ExternalProviderKey = 'OPENAI';

export const PROVIDER_DEFAULT_MODELS: Record<ProviderKey, string> = {
  GEMINI: 'gemini-2.5-flash',
  OPENAI: 'gpt-5.4-mini',
  internal_l3_tutor: 'internal-l3-tutor-v1',
  local_lora: 'local-lora-tutor-v1',
};
