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

  let dbConnected = false;
  try {
    await prisma.$connect();
    dbConnected = true;
    logger.debug('Database connection established');
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to database at startup');
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
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

const SERVER_CLOSE_TIMEOUT_MS = 10_000;

let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info({ signal }, 'Initiating graceful shutdown');

  io.close();
  logger.debug('Socket.IO server closed');

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      logger.warn('HTTP server close timed out after 10s — forcing exit');
      resolve();
    }, SERVER_CLOSE_TIMEOUT_MS);

    httpServer.close(() => {
      clearTimeout(timer);
      logger.debug('HTTP server closed');
      resolve();
    });
  });

  try {
    await prisma.$disconnect();
    logger.debug('Database connections closed');
  } catch (err) {
    logger.error({ err }, 'Error disconnecting from database');
  }

  logger.info('Graceful shutdown complete');
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception — exiting');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection — exiting');
  process.exit(1);
});
};

void bootstrap().catch(async (error) => {
  logger.fatal({ err: error }, 'Failed to bootstrap API server');
  await prisma.$disconnect();
  process.exit(1);
});
