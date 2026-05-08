import type { ProviderKey } from '../constants/providers';

export type AIFallbackCategory =
  | 'quota_exhausted'
  | 'rate_limited'
  | 'service_unavailable'
  | 'cooldown_active'
  | 'missing_credentials'
  | 'provider_unavailable'
  | 'local_fallback_used'
  | 'secondary_provider_used';

export interface AIFallbackNotice {
  category: AIFallbackCategory;
  provider?: ProviderKey | null;
  fallbackProvider?: ProviderKey | null;
  retryAfterSeconds?: number | null;
  cooldownRemainingMs?: number | null;
  temporary: boolean;
  message: string;
}

export interface AIFallbackInfo {
  notices: AIFallbackNotice[];
  localFallbackUsed: boolean;
  secondaryProviderUsed: boolean;
}
