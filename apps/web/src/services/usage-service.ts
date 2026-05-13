import type { ProviderKey } from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export interface ChatUsageResponse {
  summary: {
    requests: number;
    tokens: number;
    fallbacks: number;
    cost: number;
  };
  items: Array<{
    id: string;
    provider: ProviderKey;
    model: string;
    success: boolean;
    fallbackUsed: boolean;
    latencyMs: number;
    totalTokens: number | null;
    estimatedCost: number;
    createdAt: string;
    sessionId: string;
    messageId: string | null;
  }>;
}

export const fetchChatUsage = (sessionId?: string | null) =>
  apiRequest<ChatUsageResponse>(`/api/chat/usage${sessionId ? `?sessionId=${sessionId}` : ''}`, {
    method: 'GET',
  });
