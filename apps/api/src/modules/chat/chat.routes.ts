import { Router } from 'express';

import {
  askChatSchema,
  createChatSessionSchema,
  sessionParamSchema,
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
  router.get('/sessions', controller.listSessions);
  router.get('/sessions/archived', controller.listArchivedSessions);
  router.post('/sessions', validate(createChatSessionSchema, 'body'), controller.createSession);
  router.patch(
    '/sessions/:id',
    validate(sessionParamSchema, 'params'),
    validate(updateChatSessionSchema, 'body'),
    controller.updateSession,
  );
  router.delete('/sessions/:id', validate(sessionParamSchema, 'params'), controller.deleteSession);
  router.get('/sessions/:id/messages', validate(sessionParamSchema, 'params'), controller.getMessages);
  router.post('/ask', validate(askChatSchema, 'body'), controller.ask);

  return router;
};
