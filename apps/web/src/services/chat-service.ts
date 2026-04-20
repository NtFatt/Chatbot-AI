import type { ChatAskResponse, ChatMessage, ChatSessionSummary, PaginatedResponse } from '@chatbot-ai/shared';
import type { ProviderKey } from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export const fetchSessions = () =>
  apiRequest<PaginatedResponse<ChatSessionSummary>>('/api/chat/sessions', {
    method: 'GET',
  });

export const createSession = (input: { title?: string; providerPreference: ProviderKey }) =>
  apiRequest<ChatSessionSummary>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateSession = (
  sessionId: string,
  input: {
    title?: string;
    providerPreference?: ProviderKey;
  },
) =>
  apiRequest<ChatSessionSummary>(`/api/chat/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteSession = (sessionId: string) =>
  apiRequest<{ deleted: boolean }>(`/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });

export const fetchMessages = (sessionId: string) =>
  apiRequest<PaginatedResponse<ChatMessage>>(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'GET',
  });

export const askViaHttp = (input: {
  sessionId: string;
  clientMessageId: string;
  message: string;
  provider?: ProviderKey;
}) =>
  apiRequest<ChatAskResponse>('/api/chat/ask', {
    method: 'POST',
    body: JSON.stringify(input),
  });
