import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { env, getAIStartupIssues } from './config/env';
import { corsOriginDelegate } from './config/origins';
import { requestContextMiddleware } from './middlewares/request-context.middleware';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware';
import { AuthRepository } from './modules/auth/auth.repository';
import { AuthService } from './modules/auth/auth.service';
import { createAuthRoutes } from './modules/auth/auth.routes';
import { ChatRepository } from './modules/chat/chat.repository';
import { ChatService } from './modules/chat/chat.service';
import { createChatRoutes } from './modules/chat/chat.routes';
import { ChatGuardService } from './modules/chat/chat-guard.service';
import { MaterialsRepository } from './modules/materials/materials.repository';
import { MaterialsService } from './modules/materials/materials.service';
import { createMaterialsRoutes } from './modules/materials/materials.routes';
import { ProvidersService } from './modules/providers/providers.service';
import { createProvidersRoutes } from './modules/providers/providers.routes';
import { createUsageRoutes } from './modules/usage/usage.routes';
import { UsageService } from './modules/usage/usage.service';
import { createInsightsRoutes } from './modules/insights/insights.routes';
import { InsightsService } from './modules/insights/insights.service';
import { EvalsRepository } from './modules/evals/evals.repository';
import { EvalsService } from './modules/evals/evals.service';
import { createEvalsRoutes } from './modules/evals/evals.routes';
import { ModelRegistryRepository } from './modules/model-registry/model-registry.repository';
import { ModelRegistryService } from './modules/model-registry/model-registry.service';
import { createModelRegistryRoutes } from './modules/model-registry/model-registry.routes';
import { ArtifactsRepository } from './modules/artifacts/artifacts.repository';
import { ArtifactsService } from './modules/artifacts/artifacts.service';
import { createArtifactsRoutes, createPublicArtifactsRoutes } from './modules/artifacts/artifacts.routes';
import { TrainingRepository } from './modules/training/training.repository';
import { TrainingService } from './modules/training/training.service';
import { createTrainingRoutes } from './modules/training/training.routes';
import { GeminiAdapter } from './integrations/ai/adapters/gemini.adapter';
import { OpenAIAdapter } from './integrations/ai/adapters/openai.adapter';
import { AIOrchestratorService } from './integrations/ai/ai-orchestrator.service';
import { ModelGatewayService } from './integrations/ai/model-gateway.service';
import { AiRuntimeRouterService } from './integrations/ai/ai-runtime-router.service';
import { InternalL3TutorModelService } from './integrations/ai/internal-l3-tutor-model.service';
import { LocalLoraProvider } from './integrations/ai/local-lora.provider';
import { ProviderHealthService } from './integrations/ai/provider-health.service';
import { StructuredOutputService } from './integrations/ai/structured-output.service';
import { RetrievalService } from './integrations/retrieval/retrieval.service';
import { success } from './utils/api-response';
import { asyncHandler } from './utils/async-handler';
import { SessionIntelligenceService } from './modules/chat/session-intelligence.service';

export const createApp = () => {
  const app = express();

  const authRepository = new AuthRepository();
  const authService = new AuthService(authRepository);
  const chatRepository = new ChatRepository();
  const materialsRepository = new MaterialsRepository();
  const materialsService = new MaterialsService(materialsRepository, chatRepository);
  const retrievalService = new RetrievalService(materialsService, chatRepository);
  const chatGuardService = new ChatGuardService();
  const providerHealthService = new ProviderHealthService();
  const usageService = new UsageService();
  const insightsService = new InsightsService();
  const modelRegistryRepository = new ModelRegistryRepository();
  const modelRegistryService = new ModelRegistryService(modelRegistryRepository);
  const providersService = new ProvidersService(providerHealthService, modelRegistryService);
  const providerClients = {
    GEMINI: env.GEMINI_API_KEY ? new GeminiAdapter(env.GEMINI_API_KEY) : null,
    OPENAI: env.OPENAI_API_KEY ? new OpenAIAdapter(env.OPENAI_API_KEY) : null,
    internal_l3_tutor: null,
    local_lora: env.LOCAL_LORA_ENABLED ? new LocalLoraProvider(usageService) : null,
  };
  const aiOrchestrator = new AIOrchestratorService(
    providersService,
    providerClients,
    providerHealthService,
    usageService,
  );
  const structuredOutputService = new StructuredOutputService(
    providersService,
    providerClients,
    providerHealthService,
    usageService,
  );
  const modelGatewayService = new ModelGatewayService(
    providersService,
    providerClients,
    providerHealthService,
    usageService,
  );
  const sessionIntelligenceService = new SessionIntelligenceService(structuredOutputService);
  const internalL3TutorModelService = new InternalL3TutorModelService(usageService);
  const aiRuntimeRouter = new AiRuntimeRouterService(
    aiOrchestrator,
    modelGatewayService,
    modelRegistryService,
    internalL3TutorModelService,
  );
  const chatService = new ChatService(
    chatRepository,
    authService,
    aiRuntimeRouter,
    retrievalService,
    chatGuardService,
    sessionIntelligenceService,
  );
  const artifactsRepository = new ArtifactsRepository();
  const artifactsService = new ArtifactsService(
    artifactsRepository,
    providersService,
    structuredOutputService,
    authService,
    chatRepository,
  );
  const trainingRepository = new TrainingRepository();
  const trainingService = new TrainingService(trainingRepository, modelRegistryService);
  const evalsRepository = new EvalsRepository();
  const evalsService = new EvalsService(
    evalsRepository,
    providersService,
    modelRegistryService,
    modelGatewayService,
  );

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
  const askLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const materialsLimiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/health', asyncHandler(async (req, res) => {
    const providersState = await providersService.listProviders();
    const issues = getAIStartupIssues();

    return success(req, res, {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      ai: {
        mode:
          providersState.providers.some((provider) => provider.enabled && provider.configured)
            ? 'real'
            : env.AI_LOCAL_FALLBACK_ENABLED
              ? 'fallback-only'
              : 'unavailable',
        availableRuntimeModes: ['external_api', 'learning_engine_l3'],
        defaultRuntimeMode: 'external_api',
        l3InternalModel: 'enabled',
        l3InternalModelName: env.L3_INTERNAL_MODEL_NAME,
        l3ExternalFallbackAllowed: env.L3_ALLOW_EXTERNAL_FALLBACK,
        startupStrict: env.AI_STARTUP_STRICT,
        localFallbackEnabled: env.AI_LOCAL_FALLBACK_ENABLED,
        issues,
        providers: providersState.providers.map((provider) => ({
          key: provider.key,
          enabled: provider.enabled,
          configured: provider.configured,
          model: provider.model,
          healthState: provider.healthState,
        })),
      },
    });
  }));

  app.use('/api/auth', authLimiter, createAuthRoutes(authService));
  app.use('/api/chat/ask', askLimiter);
  app.use('/api/chat', chatLimiter, createChatRoutes(chatService));
  app.use('/api/materials', materialsLimiter, createMaterialsRoutes(materialsService));
  app.use('/api/public/artifacts', createPublicArtifactsRoutes(artifactsService));
  app.use('/api/artifacts', createArtifactsRoutes(artifactsService));
  app.use('/api/training', createTrainingRoutes(trainingService));
  app.use('/api/evals', createEvalsRoutes(evalsService));
  app.use('/api/models', createModelRegistryRoutes(modelRegistryService));
  app.use('/api/providers', createProvidersRoutes(providersService, providerClients));
  app.use('/api', createUsageRoutes(usageService));
  app.use('/api/insights', createInsightsRoutes(insightsService));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return {
    app,
    services: {
      chatService,
      providersService,
      usageService,
      insightsService,
      trainingService,
      evalsService,
      modelRegistryService,
      modelGatewayService,
    },
  };
};
