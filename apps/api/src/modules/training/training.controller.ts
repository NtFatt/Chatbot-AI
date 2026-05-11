import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import type { TrainingService } from './training.service';

export const createTrainingController = (service: TrainingService) => ({
  listDatasets: asyncHandler(async (req, res) => {
    const items = await service.listDatasets();
    return success(req, res, { items, total: items.length });
  }),

  createDataset: asyncHandler(async (req, res) => {
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const dataset = await service.createDataset(body);
    return success(req, res, dataset, 201);
  }),

  listExamples: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const items = await service.listExamples(String(params.id));
    return success(req, res, { items, total: items.length });
  }),

  createExample: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const example = await service.createExample(String(params.id), body);
    return success(req, res, example, 201);
  }),

  updateExample: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const example = await service.updateExample(String(params.id), body);
    return success(req, res, example);
  }),

  approveExample: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const example = await service.approveExample(String(params.id));
    return success(req, res, example);
  }),

  rejectExample: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const example = await service.rejectExample(String(params.id));
    return success(req, res, example);
  }),

  exportDataset: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const query = (req.validated?.query as typeof req.query) ?? req.query;
    const payload = await service.exportDataset(
      String(params.id),
      String(query.format) as 'openai_jsonl' | 'hf_chat',
    );
    return success(req, res, payload);
  }),

  listJobs: asyncHandler(async (req, res) => {
    const items = await service.listJobs();
    return success(req, res, { items, total: items.length });
  }),

  createJob: asyncHandler(async (req, res) => {
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const job = await service.createJob(body);
    return success(req, res, job, 201);
  }),
});
