import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as clientIo, type Socket as ClientSocket } from 'socket.io-client';
import { Server } from 'socket.io';

import { registerChatSocketHandlers } from '../src/sockets/chat.socket';

describe('chat socket flow', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let clientSocket: ClientSocket;

  beforeEach(async () => {
    httpServer = createServer();
    io = new Server(httpServer);

    const chatService = {
      getMessages: async () => [],
      syncMessages: async () => [],
      retry: async () => undefined,
      ask: async (_userId: string, payload: { sessionId: string; clientMessageId: string; message: string }, callbacks?: {
        onUserMessage?: (message: unknown) => void;
        onAIStart?: (meta: { provider: 'GEMINI' | 'OPENAI'; model: string }) => void;
        onAIChunk?: (chunk: string, provider: 'GEMINI' | 'OPENAI', model: string) => void;
        onAIDone?: (result: { userMessage: unknown; assistantMessage: unknown }) => void;
      }) => {
        callbacks?.onUserMessage?.({
          id: payload.clientMessageId,
          sessionId: payload.sessionId,
          clientMessageId: payload.clientMessageId,
          senderType: 'user',
          content: payload.message,
          status: 'sent',
          provider: null,
          model: null,
          latencyMs: null,
          errorCode: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        callbacks?.onAIStart?.({ provider: 'GEMINI', model: 'gemini-2.5-flash' });
        callbacks?.onAIChunk?.('Hello', 'GEMINI', 'gemini-2.5-flash');
        callbacks?.onAIChunk?.(' there', 'GEMINI', 'gemini-2.5-flash');
        callbacks?.onAIDone?.({
          userMessage: {
            id: payload.clientMessageId,
            sessionId: payload.sessionId,
            clientMessageId: payload.clientMessageId,
            senderType: 'user',
            content: payload.message,
            status: 'sent',
            provider: null,
            model: null,
            latencyMs: null,
            errorCode: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          assistantMessage: {
            id: `${payload.clientMessageId}:assistant`,
            sessionId: payload.sessionId,
            clientMessageId: `${payload.clientMessageId}:assistant`,
            senderType: 'assistant',
            content: 'Hello there',
            status: 'sent',
            provider: 'GEMINI',
            model: 'gemini-2.5-flash',
            latencyMs: 100,
            errorCode: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });

        return undefined;
      },
    };

    io.on('connection', (socket) => {
      registerChatSocketHandlers(io, socket, chatService as never, {
        userId: 'user-1',
        sessionId: 'auth-session-1',
      });
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });

    const address = httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server address unavailable');
    }

    clientSocket = clientIo(`http://127.0.0.1:${address.port}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });
  });

  afterEach(async () => {
    clientSocket.disconnect();
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('streams AI chunks after a message ack', async () => {
    const chunks: string[] = [];

    const donePromise = new Promise<void>((resolve) => {
      clientSocket.on('chat:ai_chunk', (event) => {
        chunks.push(event.chunk);
      });
      clientSocket.on('chat:ai_done', () => resolve());
    });

    const ack = await new Promise<{ ok: boolean }>((resolve) => {
      clientSocket.emit(
        'chat:send_message',
        {
          sessionId: 'b6d6ce33-e15e-41ba-b592-b3c89f7aeb6f',
          clientMessageId: 'client-message-1234',
          message: 'Explain joins',
          provider: 'GEMINI',
        },
        (response: { ok: boolean }) => resolve(response),
      );
    });

    expect(ack.ok).toBe(true);
    await donePromise;
    expect(chunks.join('')).toBe('Hello there');
  });
});
