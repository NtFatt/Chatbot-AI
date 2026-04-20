import type { ProviderKey } from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export interface ProviderResponse {
  defaultProvider: ProviderKey;
  fallbackProvider: ProviderKey | null;
  providers: Array<{
    key: ProviderKey;
    enabled: boolean;
    configured: boolean;
    isPrimary: boolean;
    model: string;
    timeoutMs: number;
    maxRetries: number;
  }>;
}

export const fetchProviders = () => apiRequest<ProviderResponse>('/api/providers', { method: 'GET' });

export interface ProviderDiagnosticsResponse {
  defaultProvider: ProviderKey;
  fallbackProvider: ProviderKey | null;
  checkedAt: string;
  realAiAvailable: boolean;
  providers: Array<{
    key: ProviderKey;
    enabled: boolean;
    configured: boolean;
    isPrimary: boolean;
    model: string;
    timeoutMs: number;
    maxRetries: number;
    status: 'ready' | 'missing_key' | 'disabled' | 'error';
    message: string;
    checkedAt: string;
    latencyMs: number | null;
  }>;
}

export const testProviders = () =>
  apiRequest<ProviderDiagnosticsResponse>('/api/providers/test', { method: 'POST' });
