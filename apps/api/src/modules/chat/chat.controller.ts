import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import type { ChatService } from './chat.service';

export const createChatController = (chatService: ChatService) => ({
  listSessions: asyncHandler(async (req, res) => {
    const sessions = await chatService.listSessions(req.auth!.userId);
    return success(req, res, {
      items: sessions,
      total: sessions.length,
    });
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
