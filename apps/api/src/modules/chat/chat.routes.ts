import { Router } from 'express';

import {
  askChatSchema,
  createChatSessionSchema,
  globalSearchSchema,
  sessionListQuerySchema,
  sessionParamSchema,
  sessionSearchSchema,
  updateChatSessionSchema,
} from '@chatbot-ai/shared';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import type { ChatService } from './chat.service';
import { createChatController } from './chat.controller';

export const createChatRoutes = (chatService: ChatService) => {
  const router = Router();
  const controller = createChatController(chatService);

  router.use(authMiddleware);
  router.get('/sessions', validate(sessionListQuerySchema, 'query'), controller.listSessions);
  router.get('/sessions/archived', validate(sessionListQuerySchema, 'query'), controller.listArchivedSessions);
  router.get('/sessions/continue-learning', controller.listContinueLearning);
  router.get('/sessions/search', validate(sessionSearchSchema, 'query'), controller.searchSessions);
  router.get('/sessions/global-search', validate(globalSearchSchema, 'query'), controller.globalSearch);
  router.post('/sessions', validate(createChatSessionSchema, 'body'), controller.createSession);
  router.patch(
    '/sessions/:id',
    validate(sessionParamSchema, 'params'),
    validate(updateChatSessionSchema, 'body'),
    controller.updateSession,
  );
  router.delete('/sessions/:id', validate(sessionParamSchema, 'params'), controller.deleteSession);
  router.get('/sessions/:id/messages', validate(sessionParamSchema, 'params'), controller.getMessages);
  router.post('/sessions/batch-archive', controller.batchArchiveSessions);
  router.post('/sessions/batch-delete', controller.batchDeleteSessions);
  router.post('/ask', validate(askChatSchema, 'body'), controller.ask);

  return router;
};
