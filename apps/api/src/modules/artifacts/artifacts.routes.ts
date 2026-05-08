import { Router } from 'express';

import {
  artifactParamSchema,
  artifactQuerySchema,
  artifactSearchSchema,
  artifactShareTokenParamSchema,
  generateArtifactSchema,
} from '@chatbot-ai/shared';
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
    '/search',
    validate(artifactSearchSchema, 'query'),
    controller.search,
  );

  router.get(
    '/favorites',
    controller.listFavorites,
  );

  router.get(
    '/session/:sessionId',
    validate(z.object({ sessionId: z.string().uuid() }), 'params'),
    controller.listBySession,
  );

  router.patch(
    '/:id/favorite',
    validate(artifactParamSchema, 'params'),
    controller.toggleFavorite,
  );

  router.get(
    '/:id/export',
    validate(artifactParamSchema, 'params'),
    controller.exportMarkdown,
  );

  router.post(
    '/:id/share',
    validate(artifactParamSchema, 'params'),
    controller.createShareLink,
  );

  router.delete(
    '/:id/share',
    validate(artifactParamSchema, 'params'),
    controller.revokeShareLink,
  );

  router.delete(
    '/:id',
    validate(artifactParamSchema, 'params'),
    controller.remove,
  );

  return router;
};

export const createPublicArtifactsRoutes = (artifactsService: ArtifactsService) => {
  const router = Router();
  const controller = createArtifactsController(artifactsService);

  router.get(
    '/:shareToken',
    validate(artifactShareTokenParamSchema, 'params'),
    controller.getPublicArtifact,
  );

  return router;
};
