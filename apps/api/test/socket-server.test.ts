import { createServer } from 'node:http';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as clientIo, type Socket as ClientSocket } from 'socket.io-client';

import { createSocketServer } from '../src/sockets';
import { signAccessToken } from '../src/utils/jwt';

describe('socket server authentication', () => {
  let httpServer: ReturnType<typeof createServer>;
  let clientSockets: ClientSocket[] = [];

  const chatService = {
    ask: async () => undefined,
    getMessages: async () => [],
    retry: async () => undefined,
    syncMessages: async () => [],
  };

  beforeEach(async () => {
    httpServer = createServer();
    createSocketServer(httpServer, chatService as never);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });
  });

  afterEach(async () => {
    clientSockets.forEach((socket) => {
      socket.disconnect();
    });
    clientSockets = [];
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  const connectClient = async (token?: string) => {
    const address = httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server address unavailable');
    }

    const socket = clientIo(`http://127.0.0.1:${address.port}`, {
      auth: token ? { token } : {},
      forceNew: true,
      transports: ['websocket'],
    });
    clientSockets.push(socket);

    return await new Promise<
      | { connected: true; socket: ClientSocket }
      | { connected: false; error: { message: string } }
    >((resolve) => {
      socket.once('connect', () => {
        resolve({ connected: true, socket });
      });
      socket.once('connect_error', (error) => {
        resolve({
          connected: false,
          error: {
            message: error.message,
          },
        });
      });
    });
  };

  it('accepts a valid access token', async () => {
    const result = await connectClient(
      signAccessToken({
        userId: 'user-1',
        sessionId: 'auth-session-1',
      }),
    );

    expect(result.connected).toBe(true);
    if (!result.connected) {
      return;
    }

    expect(result.socket.connected).toBe(true);
  });

  it('rejects a missing access token', async () => {
    const result = await connectClient();

    expect(result).toEqual({
      connected: false,
      error: {
        message: 'UNAUTHORIZED',
      },
    });
  });

  it('rejects an invalid access token', async () => {
    const result = await connectClient('not-a-valid-jwt');

    expect(result.connected).toBe(false);
    if (result.connected) {
      return;
    }

    expect(result.error.message).toMatch(/jwt|invalid/i);
  });
});
