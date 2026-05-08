import type { LearningInsightsResponse } from '@chatbot-ai/shared';

import { apiRequest } from './api-client';

export const fetchLearningInsights = () =>
  apiRequest<LearningInsightsResponse>('/api/insights/learning', {
    method: 'GET',
  });
