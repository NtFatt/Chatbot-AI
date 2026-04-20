import { Server as HttpServer } from 'node:http';

import type { ServerOptions } from 'socket.io';
import { Server } from 'socket.io';

import { corsOriginDelegate } from '../config/origins';
import { verifyAccessToken } from '../utils/jwt';
import { ChatService } from '../modules/chat/chat.service';
import { registerChatSocketHandlers } from './chat.socket';

export const createSocketServer = (httpServer: HttpServer, chatService: ChatService) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOriginDelegate,
      credentials: true,
    },
    connectionStateRecovery: {},
  } satisfies Partial<ServerOptions>);

  io.use((socket, next) => {
    try {
      const token =
        typeof socket.handshake.auth.token === 'string'
          ? socket.handshake.auth.token
          : typeof socket.handshake.headers.authorization === 'string'
            ? socket.handshake.headers.authorization.replace('Bearer ', '')
            : null;

      if (!token) {
        return next(new Error('UNAUTHORIZED'));
      }

      const payload = verifyAccessToken(token);
      socket.data.auth = {
        userId: payload.sub,
        sessionId: payload.sid,
      };

      return next();
    } catch (error) {
      return next(error as Error);
    }
  });

  io.on('connection', (socket) => {
    registerChatSocketHandlers(io, socket, chatService, socket.data.auth as { userId: string; sessionId: string });
  });

  return io;
};
