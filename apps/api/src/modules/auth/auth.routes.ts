import { Router } from 'express';

import { loginSchema, refreshSchema } from '@chatbot-ai/shared';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import type { AuthService } from './auth.service';
import { createAuthController } from './auth.controller';

export const createAuthRoutes = (authService: AuthService) => {
  const router = Router();
  const controller = createAuthController(authService);

  router.post('/login', validate(loginSchema, 'body'), controller.login);
  router.post('/refresh', validate(refreshSchema, 'body'), controller.refresh);
  router.post('/logout', validate(refreshSchema, 'body'), controller.logout);
  router.get('/me', authMiddleware, controller.me);

  return router;
};
