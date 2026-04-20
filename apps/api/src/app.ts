import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { corsOriginDelegate } from './config/origins';
import { requestContextMiddleware } from './middlewares/request-context.middleware';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware';
import { AuthRepository } from './modules/auth/auth.repository';
import { AuthService } from './modules/auth/auth.service';
import { createAuthRoutes } from './modules/auth/auth.routes';
import { ChatRepository } from './modules/chat/chat.repository';
import { ChatService } from './modules/chat/chat.service';
import { createChatRoutes } from './modules/chat/chat.routes';
import { MaterialsRepository } from './modules/materials/materials.repository';
import { MaterialsService } from './modules/materials/materials.service';
import { createMaterialsRoutes } from './modules/materials/materials.routes';
import { ProvidersService } from './modules/providers/providers.service';
import { createProvidersRoutes } from './modules/providers/providers.routes';
import { GeminiAdapter } from './integrations/ai/adapters/gemini.adapter';
import { OpenAIAdapter } from './integrations/ai/adapters/openai.adapter';
import { AIOrchestratorService } from './integrations/ai/ai-orchestrator.service';
import { success } from './utils/api-response';

export const createApp = () => {
  const app = express();

  const authRepository = new AuthRepository();
  const authService = new AuthService(authRepository);
  const chatRepository = new ChatRepository();
  const providersService = new ProvidersService();
  const providerClients = {
    GEMINI: env.GEMINI_API_KEY ? new GeminiAdapter(env.GEMINI_API_KEY) : null,
    OPENAI: env.OPENAI_API_KEY ? new OpenAIAdapter(env.OPENAI_API_KEY) : null,
  };
  const aiOrchestrator = new AIOrchestratorService(providersService, providerClients);
  const chatService = new ChatService(chatRepository, authService, aiOrchestrator);
  const materialsRepository = new MaterialsRepository();
  const materialsService = new MaterialsService(materialsRepository, chatRepository);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: corsOriginDelegate,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(requestContextMiddleware);

  const authLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const chatLimiter = rateLimit({
    windowMs: 60_000,
    limit: 45,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/health', (req, res) =>
    success(req, res, {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );

  app.use('/api/auth', authLimiter, createAuthRoutes(authService));
  app.use('/api/chat', chatLimiter, createChatRoutes(chatService));
  app.use('/api/materials', createMaterialsRoutes(materialsService));
  app.use('/api/providers', createProvidersRoutes(providersService, providerClients));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return {
    app,
    services: {
      chatService,
    },
  };
};
