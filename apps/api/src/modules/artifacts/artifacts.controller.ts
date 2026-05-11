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

  search: asyncHandler(async (req, res) => {
    const query = (req.validated?.query as typeof req.query) ?? req.query;
    const results = await artifactsService.searchArtifacts(req.auth!.userId, {
      q: String(query.q ?? '').trim(),
      limit: typeof query.limit === 'string' ? Number(query.limit) : 10,
      type: typeof query.type === 'string' ? (query.type as ArtifactGenerateType) : undefined,
    });
    return success(req, res, { items: results, total: results.length });
  }),

  listFavorites: asyncHandler(async (req, res) => {
    const artifacts = await artifactsService.listFavorites(req.auth!.userId);
    return success(req, res, { items: artifacts, total: artifacts.length });
  }),

  toggleFavorite: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const artifact = await artifactsService.toggleFavorite(req.auth!.userId, String(params.id));
    return success(req, res, artifact);
  }),

  updateContent: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const artifact = await artifactsService.updateContent(
      req.auth!.userId,
      String(params.id),
      body,
    );
    return success(req, res, artifact);
  }),

  refine: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const artifact = await artifactsService.refine(req.auth!.userId, String(params.id), body);
    return success(req, res, artifact);
  }),

  recordReviewEvent: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const event = await artifactsService.recordReviewEvent(req.auth!.userId, String(params.id), body);
    return success(req, res, event, 201);
  }),

  listReviewHistory: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const history = await artifactsService.listReviewHistory(req.auth!.userId, String(params.id));
    return success(req, res, { items: history, total: history.length });
  }),

  exportMarkdown: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const payload = await artifactsService.exportMarkdown(req.auth!.userId, String(params.id));
    return success(req, res, payload);
  }),

  createShareLink: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const payload = await artifactsService.createShareLink(req.auth!.userId, String(params.id));
    return success(req, res, payload, 201);
  }),

  revokeShareLink: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const payload = await artifactsService.revokeShareLink(req.auth!.userId, String(params.id));
    return success(req, res, payload);
  }),

  getPublicArtifact: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const artifact = await artifactsService.getPublicArtifactByToken(String(params.shareToken));
    return success(req, res, artifact);
  }),

  remove: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    await artifactsService.delete(req.auth!.userId, String(params.id));
    return success(req, res, { deleted: true });
  }),
});
