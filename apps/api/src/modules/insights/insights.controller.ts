import type { RequestHandler } from 'express';

import type { InsightsService } from './insights.service';
import { success } from '../../utils/api-response';

export const createInsightsController = (insightsService: InsightsService): { learning: RequestHandler } => ({
  learning: async (req, res) => {
    const insights = await insightsService.getLearningInsights(req.auth!.userId);
    return success(req, res, insights);
  },
});
