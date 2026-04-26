import type {
  ArtifactGenerateType,
  ArtifactType,
  PaginatedResponse,
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

export const deleteArtifact = (artifactId: string) =>
  apiRequest<{ deleted: boolean }>(`/api/artifacts/${artifactId}`, {
    method: 'DELETE',
  });
