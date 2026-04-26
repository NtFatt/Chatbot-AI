import { Router } from 'express';

import { artifactParamSchema, artifactQuerySchema, generateArtifactSchema } from '@chatbot-ai/shared';
import { z } from 'zod';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import type { ArtifactsService } from './artifacts.service';
import { createArtifactsController } from './artifacts.controller';

export const createArtifactsRoutes = (artifactsService: ArtifactsService) => {
  const router = Router();
  const controller = createArtifactsController(artifactsService);

  router.use(authMiddleware);

  router.post(
    '/generate',
    validate(generateArtifactSchema, 'body'),
    controller.generate,
  );

  router.get(
    '/',
    validate(artifactQuerySchema, 'query'),
    controller.list,
  );

  router.get(
    '/session/:sessionId',
    validate(z.object({ sessionId: z.string().uuid() }), 'params'),
    controller.listBySession,
  );

  router.delete(
    '/:id',
    validate(artifactParamSchema, 'params'),
    controller.remove,
  );

  return router;
};
