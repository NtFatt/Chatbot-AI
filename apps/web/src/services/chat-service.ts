import type { AiRuntimeMode, ChatAskResponse, ChatMessage, ChatSessionSummary, CursorPaginatedResponse, GlobalSearchResult, PaginatedResponse } from '@chatbot-ai/shared';
import type { ProviderKey } from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export interface SessionListResult {
  items: ChatSessionSummary[];
  nextCursor: string | null;
  totalCount: number;
  hasMore: boolean;
}

export const fetchSessions = (cursor?: string | null, limit = 20) =>
  apiRequest<SessionListResult>('/api/chat/sessions', {
    method: 'GET',
    params: { cursor: cursor ?? undefined, limit },
  });

export const createSession = (input: { title?: string; providerPreference: ProviderKey; aiRuntimeMode?: AiRuntimeMode }) =>
  apiRequest<ChatSessionSummary>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateSession = (
  sessionId: string,
  input: {
    title?: string;
    providerPreference?: ProviderKey;
    aiRuntimeMode?: AiRuntimeMode;
    isPinned?: boolean;
    isArchived?: boolean;
  },
) =>
  apiRequest<ChatSessionSummary>(`/api/chat/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const fetchArchivedSessions = (cursor?: string | null, limit = 20) =>
  apiRequest<SessionListResult>('/api/chat/sessions/archived', {
    method: 'GET',
    params: { cursor: cursor ?? undefined, limit },
  });

export const fetchContinueLearningSessions = () =>
  apiRequest<PaginatedResponse<ChatSessionSummary>>('/api/chat/sessions/continue-learning', {
    method: 'GET',
  });

export const searchSessions = (query: string) => {
  const qs = new URLSearchParams({ q: query }).toString();
  return apiRequest<PaginatedResponse<ChatSessionSummary>>(`/api/chat/sessions/search?${qs}`, {
    method: 'GET',
  });
};

export const globalSearch = (query: string, limit = 10, offset = 0) => {
  const params = new URLSearchParams({ q: query, limit: String(limit), offset: String(offset) });
  return apiRequest<PaginatedResponse<GlobalSearchResult>>(`/api/chat/sessions/global-search?${params}`, {
    method: 'GET',
  });
};

export const deleteSession = (sessionId: string) =>
  apiRequest<{ deleted: boolean }>(`/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });

export const batchArchiveSessions = (sessionIds: string[]) =>
  apiRequest<{ archived: boolean; count: number }>('/api/chat/sessions/batch-archive', {
    method: 'POST',
    body: JSON.stringify({ sessionIds }),
  });

export const batchDeleteSessions = (sessionIds: string[]) =>
  apiRequest<{ deleted: boolean; count: number }>('/api/chat/sessions/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ sessionIds }),
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
