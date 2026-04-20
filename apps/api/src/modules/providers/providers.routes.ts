import { Router } from 'express';
import type { ProviderKey } from '@chatbot-ai/shared';

import { authMiddleware } from '../../middlewares/auth.middleware';
import type { ProvidersService } from './providers.service';
import { createProvidersController } from './providers.controller';
import type { AIProvider } from '../../integrations/ai/ai.types';

export const createProvidersRoutes = (
  providersService: ProvidersService,
  providersMap: Record<ProviderKey, AIProvider | null>,
) => {
  const router = Router();
  const controller = createProvidersController(providersService, providersMap);

  router.get('/', authMiddleware, controller.list);
  router.post('/test', authMiddleware, controller.test);

  return router;
};
