import { Router } from 'express';

import { modelVersionParamSchema } from '@chatbot-ai/shared';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import type { ModelRegistryService } from './model-registry.service';
import { createModelRegistryController } from './model-registry.controller';

export const createModelRegistryRoutes = (service: ModelRegistryService) => {
  const router = Router();
  const controller = createModelRegistryController(service);

  router.use(authMiddleware);
  router.get('/versions', controller.listVersions);
  router.get('/active', controller.listActiveModels);
  router.post(
    '/versions/:id/activate',
    validate(modelVersionParamSchema, 'params'),
    controller.activateVersion,
  );

  return router;
};
