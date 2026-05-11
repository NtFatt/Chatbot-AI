import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import {
  createEvalCaseSchema,
  createEvalRunSchema,
  evalCaseParamSchema,
  updateEvalCaseSchema,
} from '@chatbot-ai/shared';

import { validate } from '../src/middlewares/validate.middleware';
import { createEvalsController } from '../src/modules/evals/evals.controller';
import type { EvalsService } from '../src/modules/evals/evals.service';

const buildApp = (service: EvalsService) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { userId: 'user-1', sessionId: 'sess-1' };
    req.requestId = 'test-request-id';
    next();
  });

  const controller = createEvalsController(service);
  app.get('/api/evals/cases', controller.listCases);
  app.post('/api/evals/cases', validate(createEvalCaseSchema, 'body'), controller.createCase);
  app.patch('/api/evals/cases/:id', validate(evalCaseParamSchema, 'params'), validate(updateEvalCaseSchema, 'body'), controller.updateCase);
  app.delete('/api/evals/cases/:id', validate(evalCaseParamSchema, 'params'), controller.deleteCase);
  app.get('/api/evals/runs', controller.listRuns);
  app.post('/api/evals/runs', validate(createEvalRunSchema, 'body'), controller.createRun);
  return app;
};

describe('EvalsController', () => {
  it('creates an eval case', async () => {
    const service = {
      createCase: vi.fn().mockResolvedValue({ id: 'case-1' }),
    } as unknown as EvalsService;

    const response = await request(buildApp(service))
      .post('/api/evals/cases')
      .send({
        name: 'Explain SQL joins',
        category: 'explain_concept',
        inputMessages: [{ role: 'user', content: 'Explain SQL joins.' }],
      });

    expect(response.status).toBe(201);
    expect(service.createCase).toHaveBeenCalledWith({
      name: 'Explain SQL joins',
      category: 'explain_concept',
      inputMessages: [{ role: 'user', content: 'Explain SQL joins.' }],
    });
  });

  it('runs an evaluation benchmark', async () => {
    const service = {
      createRun: vi.fn().mockResolvedValue({ id: 'run-1', averageScore: 0.82 }),
    } as unknown as EvalsService;

    const response = await request(buildApp(service))
      .post('/api/evals/runs')
      .send({
        provider: 'OPENAI',
        model: 'gpt-5.4-mini',
        evalCaseIds: ['11111111-1111-4111-8111-111111111111'],
      });

    expect(response.status).toBe(201);
    expect(service.createRun).toHaveBeenCalledWith({
      provider: 'OPENAI',
      model: 'gpt-5.4-mini',
      evalCaseIds: ['11111111-1111-4111-8111-111111111111'],
    });
  });
});
