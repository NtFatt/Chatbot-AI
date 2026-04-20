import { createServer } from 'node:http';

import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { createApp } from './app';
import { createSocketServer } from './sockets';

const bootstrap = async () => {
  const { app, services } = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer, services.chatService);

  await prisma.$connect();

  httpServer.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        origins: env.clientOrigins,
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
