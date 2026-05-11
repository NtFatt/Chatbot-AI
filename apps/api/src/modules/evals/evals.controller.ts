import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import type { EvalsService } from './evals.service';

export const createEvalsController = (service: EvalsService) => ({
  listCases: asyncHandler(async (req, res) => {
    const items = await service.listCases();
    return success(req, res, { items, total: items.length });
  }),

  createCase: asyncHandler(async (req, res) => {
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const item = await service.createCase(body);
    return success(req, res, item, 201);
  }),

  updateCase: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const item = await service.updateCase(String(params.id), body);
    return success(req, res, item);
  }),

  deleteCase: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    await service.deleteCase(String(params.id));
    return success(req, res, { deleted: true });
  }),

  listRuns: asyncHandler(async (req, res) => {
    const items = await service.listRuns();
    return success(req, res, { items, total: items.length });
  }),

  createRun: asyncHandler(async (req, res) => {
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const item = await service.createRun(body);
    return success(req, res, item, 201);
  }),
});
