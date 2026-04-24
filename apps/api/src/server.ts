import { createServer } from 'node:http';

import { env, getAIStartupIssues } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { createApp } from './app';
import { createSocketServer } from './sockets';

const bootstrap = async () => {
  const { app, services } = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer, services.chatService);

  await prisma.$connect();
  const providersState = await services.providersService.listProviders();
  const startupIssues = getAIStartupIssues();

  providersState.providers.forEach((provider) => {
    if (provider.enabled && !provider.configured) {
      logger.warn(
        {
          provider: provider.key,
          runtimeSource: provider.runtimeSource,
        },
        'Provider is enabled but missing API credentials',
      );
    }
  });

  startupIssues.forEach((issue) => {
    logger[issue.severity === 'error' ? 'error' : 'warn'](
      {
        provider: issue.provider,
        code: issue.code,
      },
      issue.message,
    );
  });

  if (env.AI_STARTUP_STRICT && startupIssues.some((issue) => issue.severity === 'error')) {
    throw new Error(
      `AI startup strict mode blocked boot because runtime is not ready: ${startupIssues
        .filter((issue) => issue.severity === 'error')
        .map((issue) => issue.code)
        .join(', ')}`,
    );
  }

  httpServer.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        origins: env.clientOrigins,
        ai: {
          primary: providersState.defaultProvider,
          fallback: providersState.fallbackProvider,
          localFallbackEnabled: providersState.localFallbackEnabled,
          startupStrict: env.AI_STARTUP_STRICT,
          issues: startupIssues.map((issue) => ({
            code: issue.code,
            severity: issue.severity,
            provider: issue.provider,
          })),
          providers: providersState.providers.map((provider) => ({
            key: provider.key,
            enabled: provider.enabled,
            configured: provider.configured,
            model: provider.model,
            healthState: provider.healthState,
          })),
        },
      },
      'API server listening',
    );
  });

  const shutdown = async () => {
    logger.info('Shutting down services');
    io.close();
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
};

void bootstrap().catch(async (error) => {
  logger.fatal({ err: error }, 'Failed to bootstrap API server');
  await prisma.$disconnect();
  process.exit(1);
});
