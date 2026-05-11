import { Router } from 'express';

import {
  createEvalCaseSchema,
  createEvalRunSchema,
  evalCaseParamSchema,
  updateEvalCaseSchema,
} from '@chatbot-ai/shared';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import type { EvalsService } from './evals.service';
import { createEvalsController } from './evals.controller';

export const createEvalsRoutes = (service: EvalsService) => {
  const router = Router();
  const controller = createEvalsController(service);

  router.use(authMiddleware);
  router.get('/cases', controller.listCases);
  router.post('/cases', validate(createEvalCaseSchema, 'body'), controller.createCase);
  router.patch(
    '/cases/:id',
    validate(evalCaseParamSchema, 'params'),
    validate(updateEvalCaseSchema, 'body'),
    controller.updateCase,
  );
  router.delete('/cases/:id', validate(evalCaseParamSchema, 'params'), controller.deleteCase);
  router.get('/runs', controller.listRuns);
  router.post('/runs', validate(createEvalRunSchema, 'body'), controller.createRun);

  return router;
};
