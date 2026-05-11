import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import type { ChatService } from './chat.service';

export const createChatController = (chatService: ChatService) => ({
  listSessions: asyncHandler(async (req, res) => {
    const query = (req.validated?.query as { cursor?: string; limit?: number }) ?? req.query ?? {};
    const result = await chatService.listSessions(
      req.auth!.userId,
      query.cursor,
      query.limit,
    );
    return success(req, res, result);
  }),
  listArchivedSessions: asyncHandler(async (req, res) => {
    const query = (req.validated?.query as { cursor?: string; limit?: number }) ?? req.query ?? {};
    const result = await chatService.listArchivedSessions(
      req.auth!.userId,
      query.cursor,
      query.limit,
    );
    return success(req, res, result);
  }),
  listContinueLearning: asyncHandler(async (req, res) => {
    const sessions = await chatService.listContinueLearningSessions(req.auth!.userId);
    return success(req, res, {
      items: sessions,
      total: sessions.length,
    });
  }),
  searchSessions: asyncHandler(async (req, res) => {
    const query = (req.validated?.query as { q?: string })?.q ?? (req.query.q as string) ?? '';
    const sessions = await chatService.searchSessions(req.auth!.userId, query);
    return success(req, res, {
      items: sessions,
      total: sessions.length,
    });
  }),
  globalSearch: asyncHandler(async (req, res) => {
    const query = (req.validated?.query as { q?: string; limit?: number; offset?: number }) ?? req.query;
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    if (!q) {
      return success(req, res, { items: [], total: 0 });
    }
    const results = await chatService.globalSearch(
      req.auth!.userId,
      q,
      typeof query.limit === 'number' ? query.limit : 10,
      typeof query.offset === 'number' ? query.offset : 0,
    );
    return success(req, res, { items: results, total: results.length });
  }),
  createSession: asyncHandler(async (req, res) => {
    const session = await chatService.createSession(
      req.auth!.userId,
      ((req.validated?.body as typeof req.body) ?? req.body),
    );
    return success(req, res, session, 201);
  }),
  updateSession: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const session = await chatService.updateSession(req.auth!.userId, String(params.id), body);
    return success(req, res, session);
  }),
  deleteSession: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    await chatService.deleteSession(req.auth!.userId, String(params.id));
    return success(req, res, { deleted: true });
  }),
  batchArchiveSessions: asyncHandler(async (req, res) => {
    const body = req.body as { sessionIds: string[] };
    await chatService.batchArchiveSessions(req.auth!.userId, body.sessionIds);
    return success(req, res, { archived: true, count: body.sessionIds.length });
  }),
  batchDeleteSessions: asyncHandler(async (req, res) => {
    const body = req.body as { sessionIds: string[] };
    await chatService.batchDeleteSessions(req.auth!.userId, body.sessionIds);
    return success(req, res, { deleted: true, count: body.sessionIds.length });
  }),
  getMessages: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const messages = await chatService.getMessages(req.auth!.userId, String(params.id));
    return success(req, res, {
      items: messages,
      total: messages.length,
    });
  }),
  ask: asyncHandler(async (req, res) => {
    const response = await chatService.ask(
      req.auth!.userId,
      ((req.validated?.body as typeof req.body) ?? req.body),
    );
    return success(req, res, response, 201);
  }),
});
