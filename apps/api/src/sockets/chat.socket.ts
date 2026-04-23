import { randomUUID } from 'node:crypto';

import {
  askChatSchema,
  MAX_MESSAGE_CHARS,
  type JoinSessionPayload,
  type RetryMessagePayload,
  type SendMessagePayload,
  type SocketAck,
  type SyncStatePayload,
} from '@chatbot-ai/shared';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';

import { ChatService } from '../modules/chat/chat.service';
import { AppError } from '../utils/errors';

const joinSessionSchema = z.object({
  sessionId: z.string().uuid(),
});
const retryMessageSchema = z.object({
  sessionId: z.string().uuid(),
  clientMessageId: z.string().min(8).max(100),
  message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS).optional(),
  provider: z.enum(['GEMINI', 'OPENAI']).optional(),
});
const syncStateSchema = z.object({
  sessionId: z.string().uuid(),
  since: z.string().datetime().optional(),
});

const emitAck = (ack: ((payload: SocketAck) => void) | undefined, payload: SocketAck) => {
  ack?.(payload);
};

const toAppError = (
  error: unknown,
  fallback: {
    statusCode: number;
    code: string;
    message: string;
  },
) =>
  error instanceof AppError
    ? error
    : new AppError(fallback.statusCode, fallback.code, fallback.message);

export const registerChatSocketHandlers = (
  io: Server,
  socket: Socket,
  chatService: ChatService,
  auth: { userId: string; sessionId: string },
) => {
  const emitProcessingFailure = (
    sessionId: string,
    clientMessageId: string,
    error: unknown,
    fallback: {
      statusCode: number;
      code: string;
      message: string;
    },
  ) => {
    const appError = toAppError(error, fallback);
    io.to(sessionId).emit('chat:message_failed', {
      sessionId,
      clientMessageId,
      error: {
        code: appError.code,
        message: appError.message,
      },
    });
    socket.emit('chat:error', {
      code: appError.code,
      message: appError.message,
    });
  };

  socket.on(
    'chat:join_session',
    async (payload: JoinSessionPayload, ack?: (payload: SocketAck) => void) => {
      const requestId = randomUUID();

      try {
        const parsed = joinSessionSchema.parse(payload);
        await chatService.getMessages(auth.userId, parsed.sessionId);
        await socket.join(parsed.sessionId);

        emitAck(ack, {
          ok: true,
          requestId,
        });
      } catch (error) {
        const appError = toAppError(error, {
          statusCode: 400,
          code: 'SOCKET_JOIN_FAILED',
          message: 'Unable to join chat session.',
        });

        emitAck(ack, {
          ok: false,
          requestId,
          error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
          },
        });
      }
    },
  );

  socket.on(
    'chat:send_message',
    async (payload: SendMessagePayload, ack?: (payload: SocketAck) => void) => {
      const requestId = randomUUID();

      try {
        const parsed = askChatSchema.parse(payload);
        await socket.join(parsed.sessionId);

        emitAck(ack, { ok: true, requestId });

        void chatService
          .ask(auth.userId, parsed, {
          onUserMessage: (message) => {
            io.to(parsed.sessionId).emit('chat:message_accepted', {
              sessionId: parsed.sessionId,
              message,
            });
          },
          onAIStart: (meta) => {
            io.to(parsed.sessionId).emit('chat:ai_started', {
              sessionId: parsed.sessionId,
              clientMessageId: parsed.clientMessageId,
              provider: meta.provider,
              model: meta.model,
            });
          },
          onAIChunk: (chunk, provider, model) => {
            io.to(parsed.sessionId).emit('chat:ai_chunk', {
              sessionId: parsed.sessionId,
              clientMessageId: parsed.clientMessageId,
              chunk,
              provider,
              model,
            });
          },
          onAIDone: (response) => {
            io.to(parsed.sessionId).emit('chat:ai_done', {
              sessionId: parsed.sessionId,
              userMessage: response.userMessage,
              assistantMessage: response.assistantMessage,
            });
          },
          onMessageFailed: (message, error) => {
            io.to(parsed.sessionId).emit('chat:message_received', {
              sessionId: parsed.sessionId,
              message,
            });
            io.to(parsed.sessionId).emit('chat:message_failed', {
              sessionId: parsed.sessionId,
              clientMessageId: parsed.clientMessageId,
              error,
            });
          },
          onSessionUpdated: (session) => {
            io.to(parsed.sessionId).emit('chat:session_updated', { session });
          },
          })
          .catch((error) => {
            emitProcessingFailure(parsed.sessionId, parsed.clientMessageId, error, {
              statusCode: 500,
              code: 'SOCKET_SEND_PROCESSING_FAILED',
              message: 'Unable to finish processing this message.',
            });
          });
      } catch (error) {
        const appError = toAppError(error, {
          statusCode: 400,
          code: 'SOCKET_SEND_FAILED',
          message: 'Unable to send message.',
        });

        emitAck(ack, {
          ok: false,
          requestId,
          error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
          },
        });
        socket.emit('chat:error', {
          code: appError.code,
          message: appError.message,
        });
      }
    },
  );

  socket.on(
    'chat:retry_message',
    async (payload: RetryMessagePayload, ack?: (payload: SocketAck) => void) => {
      const requestId = randomUUID();

      try {
        const parsed = retryMessageSchema.parse(payload);
        emitAck(ack, { ok: true, requestId });

        void chatService
          .retry(auth.userId, parsed, {
          onAIStart: (meta) => {
            io.to(parsed.sessionId).emit('chat:ai_started', {
              sessionId: parsed.sessionId,
              clientMessageId: parsed.clientMessageId,
              provider: meta.provider,
              model: meta.model,
            });
          },
          onAIChunk: (chunk, provider, model) => {
            io.to(parsed.sessionId).emit('chat:ai_chunk', {
              sessionId: parsed.sessionId,
              clientMessageId: parsed.clientMessageId,
              chunk,
              provider,
              model,
            });
          },
          onAIDone: (response) => {
            io.to(parsed.sessionId).emit('chat:ai_done', {
              sessionId: parsed.sessionId,
              userMessage: response.userMessage,
              assistantMessage: response.assistantMessage,
            });
          },
          onMessageFailed: (message, error) => {
            io.to(parsed.sessionId).emit('chat:message_received', {
              sessionId: parsed.sessionId,
              message,
            });
            io.to(parsed.sessionId).emit('chat:message_failed', {
              sessionId: parsed.sessionId,
              clientMessageId: parsed.clientMessageId,
              error,
            });
          },
          onSessionUpdated: (session) => {
            io.to(parsed.sessionId).emit('chat:session_updated', { session });
          },
          })
          .catch((error) => {
            emitProcessingFailure(parsed.sessionId, parsed.clientMessageId, error, {
              statusCode: 500,
              code: 'SOCKET_RETRY_PROCESSING_FAILED',
              message: 'Unable to retry this message right now.',
            });
          });
      } catch (error) {
        const appError = toAppError(error, {
          statusCode: 400,
          code: 'SOCKET_RETRY_FAILED',
          message: 'Unable to retry message.',
        });

        emitAck(ack, {
          ok: false,
          requestId,
          error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
          },
        });
      }
    },
  );

  socket.on('chat:typing', (_payload: unknown, ack?: (payload: SocketAck) => void) => {
    emitAck(ack, {
      ok: true,
      requestId: randomUUID(),
    });
  });

  socket.on(
    'chat:sync_state',
    async (payload: SyncStatePayload, ack?: (payload: SocketAck) => void) => {
      const requestId = randomUUID();

      try {
        const parsed = syncStateSchema.parse(payload);
        const messages = await chatService.syncMessages(auth.userId, parsed.sessionId, parsed.since);

        messages.forEach((message) => {
          socket.emit('chat:message_received', {
            sessionId: parsed.sessionId,
            message,
          });
        });

        const cursor = messages.reduce<string | undefined>((latest, message) => {
          const candidate = message.updatedAt || message.createdAt;
          if (!latest || candidate > latest) {
            return candidate;
          }
          return latest;
        }, parsed.since);

        emitAck(ack, {
          ok: true,
          requestId,
          meta: {
            syncedCount: messages.length,
            cursor,
          },
        });
      } catch (error) {
        const appError = toAppError(error, {
          statusCode: 400,
          code: 'SOCKET_SYNC_FAILED',
          message: 'Unable to sync session state.',
        });

        emitAck(ack, {
          ok: false,
          requestId,
          error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
          },
        });
      }
    },
  );
};
