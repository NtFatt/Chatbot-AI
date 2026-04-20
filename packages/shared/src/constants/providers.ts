export const PROVIDER_KEYS = ['GEMINI', 'OPENAI'] as const;

export type ProviderKey = (typeof PROVIDER_KEYS)[number];

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
