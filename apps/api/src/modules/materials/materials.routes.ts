import { Router } from 'express';

import { materialSearchSchema } from '@chatbot-ai/shared';
import { z } from 'zod';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import type { MaterialsService } from './materials.service';
import { createMaterialsController } from './materials.controller';

export const createMaterialsRoutes = (materialsService: MaterialsService) => {
  const router = Router();
  const controller = createMaterialsController(materialsService);
  const recommendSchema = materialSearchSchema.extend({
    sessionId: z.string().uuid().optional(),
  });

  router.use(authMiddleware);
  router.get('/search', validate(materialSearchSchema, 'query'), controller.search);
  router.get('/recommend', validate(recommendSchema, 'query'), controller.recommend);

  return router;
};
