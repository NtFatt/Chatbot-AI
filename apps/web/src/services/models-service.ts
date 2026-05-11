import type { ModelVersion, PaginatedResponse } from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export const fetchModelVersions = () =>
  apiRequest<PaginatedResponse<ModelVersion>>('/api/models/versions', {
    method: 'GET',
  });

export const fetchActiveModels = () =>
  apiRequest<PaginatedResponse<{ runtimeProvider: 'GEMINI' | 'OPENAI' | 'LOCAL'; version: ModelVersion }>>(
    '/api/models/active',
    {
      method: 'GET',
    },
  );

export const activateModelVersion = (modelVersionId: string) =>
  apiRequest<ModelVersion>(`/api/models/versions/${modelVersionId}/activate`, {
    method: 'POST',
  });
