import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import {
  createTrainingDatasetSchema,
  createTrainingExampleSchema,
  createTrainingJobSchema,
  trainingDatasetExportQuerySchema,
  trainingDatasetParamSchema,
  trainingExampleParamSchema,
  updateTrainingExampleSchema,
} from '@chatbot-ai/shared';

import { validate } from '../src/middlewares/validate.middleware';
import type { TrainingService } from '../src/modules/training/training.service';
import { createTrainingController } from '../src/modules/training/training.controller';

const buildApp = (service: TrainingService) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { userId: 'user-1', sessionId: 'sess-1' };
    req.requestId = 'test-request-id';
    next();
  });

  const controller = createTrainingController(service);
  app.get('/api/training/datasets', controller.listDatasets);
  app.post('/api/training/datasets', validate(createTrainingDatasetSchema, 'body'), controller.createDataset);
  app.get('/api/training/datasets/:id/examples', validate(trainingDatasetParamSchema, 'params'), controller.listExamples);
  app.post('/api/training/datasets/:id/examples', validate(trainingDatasetParamSchema, 'params'), validate(createTrainingExampleSchema, 'body'), controller.createExample);
  app.patch('/api/training/examples/:id', validate(trainingExampleParamSchema, 'params'), validate(updateTrainingExampleSchema, 'body'), controller.updateExample);
  app.post('/api/training/examples/:id/approve', validate(trainingExampleParamSchema, 'params'), controller.approveExample);
  app.post('/api/training/examples/:id/reject', validate(trainingExampleParamSchema, 'params'), controller.rejectExample);
  app.get('/api/training/datasets/:id/export', validate(trainingDatasetParamSchema, 'params'), validate(trainingDatasetExportQuerySchema, 'query'), controller.exportDataset);
  app.get('/api/training/jobs', controller.listJobs);
  app.post('/api/training/jobs', validate(createTrainingJobSchema, 'body'), controller.createJob);
  return app;
};

describe('TrainingController', () => {
  it('lists datasets', async () => {
    const service = {
      listDatasets: vi.fn().mockResolvedValue([{ id: 'dataset-1' }]),
    } as unknown as TrainingService;

    const response = await request(buildApp(service)).get('/api/training/datasets');

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(service.listDatasets).toHaveBeenCalledTimes(1);
  });

  it('creates a dataset', async () => {
    const service = {
      createDataset: vi.fn().mockResolvedValue({ id: 'dataset-1', name: 'L3 set' }),
    } as unknown as TrainingService;

    const response = await request(buildApp(service))
      .post('/api/training/datasets')
      .send({ name: 'L3 set', description: 'Examples for tutoring' });

    expect(response.status).toBe(201);
    expect(service.createDataset).toHaveBeenCalledWith({
      name: 'L3 set',
      description: 'Examples for tutoring',
      status: 'draft',
    });
  });

  it('approves an example', async () => {
    const service = {
      approveExample: vi.fn().mockResolvedValue({ id: 'example-1', status: 'approved' }),
    } as unknown as TrainingService;

    const response = await request(buildApp(service))
      .post('/api/training/examples/11111111-1111-4111-8111-111111111111/approve');

    expect(response.status).toBe(200);
    expect(service.approveExample).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  });

  it('exports a dataset in OpenAI JSONL format', async () => {
    const service = {
      exportDataset: vi.fn().mockResolvedValue({
        datasetId: 'dataset-1',
        format: 'openai_jsonl',
        filename: 'dataset-openai.jsonl',
        mimeType: 'application/x-ndjson',
        content: '{"messages":[]}',
        exportedCount: 1,
      }),
    } as unknown as TrainingService;

    const response = await request(buildApp(service))
      .get('/api/training/datasets/11111111-1111-4111-8111-111111111111/export?format=openai_jsonl');

    expect(response.status).toBe(200);
    expect(service.exportDataset).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'openai_jsonl',
    );
  });

  it('creates a training job', async () => {
    const service = {
      createJob: vi.fn().mockResolvedValue({ id: 'job-1', status: 'queued' }),
    } as unknown as TrainingService;

    const response = await request(buildApp(service))
      .post('/api/training/jobs')
      .send({
        datasetId: '11111111-1111-4111-8111-111111111111',
        provider: 'local_lora',
        baseModel: 'Qwen/Qwen2.5-3B-Instruct',
      });

    expect(response.status).toBe(201);
    expect(service.createJob).toHaveBeenCalledWith({
      datasetId: '11111111-1111-4111-8111-111111111111',
      provider: 'local_lora',
      baseModel: 'Qwen/Qwen2.5-3B-Instruct',
    });
  });
});
