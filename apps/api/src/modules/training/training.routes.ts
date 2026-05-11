import { Router } from 'express';

import {
  createTrainingDatasetSchema,
  createTrainingExampleSchema,
  createTrainingJobSchema,
  trainingDatasetExportQuerySchema,
  trainingDatasetParamSchema,
  trainingExampleParamSchema,
  updateTrainingExampleSchema,
} from '@chatbot-ai/shared';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import type { TrainingService } from './training.service';
import { createTrainingController } from './training.controller';

export const createTrainingRoutes = (service: TrainingService) => {
  const router = Router();
  const controller = createTrainingController(service);

  router.use(authMiddleware);

  router.get('/datasets', controller.listDatasets);
  router.post('/datasets', validate(createTrainingDatasetSchema, 'body'), controller.createDataset);
  router.get(
    '/datasets/:id/examples',
    validate(trainingDatasetParamSchema, 'params'),
    controller.listExamples,
  );
  router.post(
    '/datasets/:id/examples',
    validate(trainingDatasetParamSchema, 'params'),
    validate(createTrainingExampleSchema, 'body'),
    controller.createExample,
  );
  router.patch(
    '/examples/:id',
    validate(trainingExampleParamSchema, 'params'),
    validate(updateTrainingExampleSchema, 'body'),
    controller.updateExample,
  );
  router.post(
    '/examples/:id/approve',
    validate(trainingExampleParamSchema, 'params'),
    controller.approveExample,
  );
  router.post(
    '/examples/:id/reject',
    validate(trainingExampleParamSchema, 'params'),
    controller.rejectExample,
  );
  router.get(
    '/datasets/:id/export',
    validate(trainingDatasetParamSchema, 'params'),
    validate(trainingDatasetExportQuerySchema, 'query'),
    controller.exportDataset,
  );
  router.get('/jobs', controller.listJobs);
  router.post('/jobs', validate(createTrainingJobSchema, 'body'), controller.createJob);

  return router;
};
