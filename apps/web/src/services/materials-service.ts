import type {
  MaterialRecommendation,
  MaterialSearchParams,
  PaginatedResponse,
} from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });

  return search.toString();
};

export const searchMaterials = (params: MaterialSearchParams) =>
  apiRequest<PaginatedResponse<MaterialRecommendation>>(
    `/api/materials/search?${buildQuery({
      q: params.q,
      subject: params.subject,
      topic: params.topic,
      level: params.level,
      type: params.type,
      limit: params.limit ?? 8,
    })}`,
  );

export const recommendMaterials = (params: MaterialSearchParams & { sessionId?: string }) =>
  apiRequest<PaginatedResponse<MaterialRecommendation>>(
    `/api/materials/recommend?${buildQuery({
      q: params.q,
      subject: params.subject,
      topic: params.topic,
      level: params.level,
      type: params.type,
      limit: params.limit ?? 6,
      sessionId: params.sessionId,
    })}`,
  );
