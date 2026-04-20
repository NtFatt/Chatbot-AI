import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { materialSearchSchema } from '@chatbot-ai/shared';

import { validate } from '../src/middlewares/validate.middleware';
import { createMaterialsController } from '../src/modules/materials/materials.controller';

describe('materials query validation', () => {
  it('passes validated query payloads without mutating Express query internals', async () => {
    const app = express();
    const materialsService = {
      search: vi.fn().mockResolvedValue([]),
      recommend: vi.fn(),
    };
    const controller = createMaterialsController(materialsService as never);

    app.use((req, _res, next) => {
      req.auth = {
        userId: 'user-1',
        sessionId: 'auth-session-1',
      };
      req.requestId = 'test-request-id';
      next();
    });

    app.get('/api/materials/search', validate(materialSearchSchema, 'query'), controller.search);

    const response = await request(app).get('/api/materials/search?limit=6&q=sql');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(materialsService.search).toHaveBeenCalledWith({
      limit: 6,
      q: 'sql',
    });
  });
});
