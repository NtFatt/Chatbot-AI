import type { ProviderKey } from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export interface ProviderResponse {
  defaultProvider: ProviderKey;
  fallbackProvider: ProviderKey | null;
  localFallbackEnabled: boolean;
  providers: Array<{
    key: ProviderKey;
    enabled: boolean;
    configured: boolean;
    isPrimary: boolean;
    model: string;
    timeoutMs: number;
    maxRetries: number;
    healthState: 'healthy' | 'cooldown' | 'degraded';
    cooldownRemainingMs: number;
    runtimeSource: 'db' | 'env' | 'default';
  }>;
}

export const fetchProviders = () => apiRequest<ProviderResponse>('/api/providers', { method: 'GET' });

export interface ProviderDiagnosticsResponse {
  defaultProvider: ProviderKey;
  fallbackProvider: ProviderKey | null;
  checkedAt: string;
  realAiAvailable: boolean;
  localFallbackEnabled: boolean;
  providers: Array<{
    key: ProviderKey;
    enabled: boolean;
    configured: boolean;
    isPrimary: boolean;
    model: string;
    timeoutMs: number;
    maxRetries: number;
    healthState: 'healthy' | 'cooldown' | 'degraded';
    cooldownRemainingMs: number;
    runtimeSource: 'db' | 'env' | 'default';
    status: 'ready' | 'missing_key' | 'disabled' | 'error' | 'cooldown';
    message: string;
    checkedAt: string;
    latencyMs: number | null;
  }>;
}

export const testProviders = () =>
  apiRequest<ProviderDiagnosticsResponse>('/api/providers/test', { method: 'POST' });

export interface ProviderMetricsResponse {
  items: Array<{
    provider: ProviderKey;
    totalRequests: number;
    successCount: number;
    failureCount: number;
    fallbackCount: number;
    avgLatencyMs: number;
    totalTokens: number;
    estimatedCost: number;
    lastSeenAt: string | null;
  }>;
  total: number;
}

export interface ProviderIncidentsResponse {
  items: Array<{
    id: string;
    provider: ProviderKey;
    model: string;
    errorCode: string;
    errorMessage: string;
    retryable: boolean;
    requestId: string | null;
    createdAt: string;
  }>;
  total: number;
}

export const fetchProviderMetrics = () =>
  apiRequest<ProviderMetricsResponse>('/api/providers/metrics', { method: 'GET' });

export const fetchProviderIncidents = (limit = 20) =>
  apiRequest<ProviderIncidentsResponse>(`/api/providers/incidents?limit=${limit}`, {
    method: 'GET',
  });
