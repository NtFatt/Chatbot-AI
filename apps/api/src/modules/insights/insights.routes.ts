import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';
import type { InsightsService } from './insights.service';
import { createInsightsController } from './insights.controller';

export const createInsightsRoutes = (insightsService: InsightsService) => {
  const router = Router();
  const controller = createInsightsController(insightsService);

  router.use(authMiddleware);
  router.get('/learning', asyncHandler(controller.learning));

  return router;
};
