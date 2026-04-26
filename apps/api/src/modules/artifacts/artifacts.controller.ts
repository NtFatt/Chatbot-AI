import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import type { ArtifactGenerateType } from '@chatbot-ai/shared';
import type { ArtifactsService } from './artifacts.service';

export const createArtifactsController = (artifactsService: ArtifactsService) => ({
  generate: asyncHandler(async (req, res) => {
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const artifact = await artifactsService.generate(req.auth!.userId, body);
    return success(req, res, artifact, 201);
  }),

  list: asyncHandler(async (req, res) => {
    const query = (req.validated?.query as typeof req.query) ?? req.query;
    const artifacts = await artifactsService.list(req.auth!.userId, {
      sessionId: typeof query.sessionId === 'string' ? query.sessionId : undefined,
      type: typeof query.type === 'string' ? (query.type as ArtifactGenerateType) : undefined,
      limit: typeof query.limit === 'string' ? Number(query.limit) : undefined,
    });
    return success(req, res, {
      items: artifacts,
      total: artifacts.length,
    });
  }),

  listBySession: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const artifacts = await artifactsService.listBySession(
      req.auth!.userId,
      String(params.sessionId),
    );
    return success(req, res, {
      items: artifacts,
      total: artifacts.length,
    });
  }),

  remove: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    await artifactsService.delete(req.auth!.userId, String(params.id));
    return success(req, res, { deleted: true });
  }),
});
