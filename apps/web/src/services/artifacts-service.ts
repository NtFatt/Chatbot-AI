import type {
  ArtifactExportPayload,
  ArtifactGenerateType,
  ArtifactSharePayload,
  ArtifactShareRevokePayload,
  ArtifactSearchResult,
  ArtifactType,
  PaginatedResponse,
  PublicStudyArtifact,
  StudyArtifact,
} from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export const generateArtifact = (input: {
  sessionId?: string;
  messageId?: string;
  type: ArtifactGenerateType;
  sourceContent: string;
}) =>
  apiRequest<StudyArtifact>('/api/artifacts/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const fetchArtifacts = (params?: {
  sessionId?: string;
  type?: ArtifactType;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();
  if (params?.sessionId) searchParams.set('sessionId', params.sessionId);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  return apiRequest<PaginatedResponse<StudyArtifact>>(`/api/artifacts${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
};

export const fetchSessionArtifacts = (sessionId: string) =>
  apiRequest<PaginatedResponse<StudyArtifact>>(`/api/artifacts/session/${sessionId}`, {
    method: 'GET',
  });

export const searchArtifacts = (params: {
  q: string;
  limit?: number;
  type?: ArtifactType;
}) => {
  const searchParams = new URLSearchParams({ q: params.q });
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.type) searchParams.set('type', params.type);
  return apiRequest<PaginatedResponse<ArtifactSearchResult>>(`/api/artifacts/search?${searchParams}`, {
    method: 'GET',
  });
};

export const fetchFavorites = () =>
  apiRequest<PaginatedResponse<StudyArtifact>>('/api/artifacts/favorites', { method: 'GET' });

export const toggleFavorite = (artifactId: string) =>
  apiRequest<StudyArtifact>(`/api/artifacts/${artifactId}/favorite`, { method: 'PATCH' });

export const deleteArtifact = (artifactId: string) =>
  apiRequest<{ deleted: boolean }>(`/api/artifacts/${artifactId}`, { method: 'DELETE' });

export const exportArtifactMarkdown = (artifactId: string) =>
  apiRequest<ArtifactExportPayload>(`/api/artifacts/${artifactId}/export`, { method: 'GET' });

export const createArtifactShareLink = (artifactId: string) =>
  apiRequest<ArtifactSharePayload>(`/api/artifacts/${artifactId}/share`, { method: 'POST' });

export const revokeArtifactShareLink = (artifactId: string) =>
  apiRequest<ArtifactShareRevokePayload>(`/api/artifacts/${artifactId}/share`, { method: 'DELETE' });

export const fetchPublicArtifact = (shareToken: string) =>
  apiRequest<PublicStudyArtifact>(`/api/public/artifacts/${shareToken}`, {
    method: 'GET',
    skipAuth: true,
    retryOnAuth: false,
  });

export const buildArtifactShareUrl = (shareToken: string) =>
  new URL(`/shared/artifacts/${shareToken}`, window.location.origin).toString();
