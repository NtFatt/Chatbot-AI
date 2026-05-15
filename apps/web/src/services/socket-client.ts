import type { SocketAck } from '@chatbot-ai/shared';
import { io, type Socket } from 'socket.io-client';

import { SocketTransportError, createSocketTransportError } from '../utils/transport-errors';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

declare global {
  interface Window {
    __CHATBOT_AI_SOCKET_TEST__?: {
      disconnect: () => void;
      reconnect: () => void;
      state: () => string;
    };
  }
}

class ChatSocketClient {
  private socket: Socket | null = null;
  private currentToken: string | null = null;
  private lastToken: string | null = null;

  private syncTestHandle() {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    window.__CHATBOT_AI_SOCKET_TEST__ = {
      disconnect: () => {
        this.socket?.disconnect();
      },
      reconnect: () => {
        if (this.socket) {
          this.socket.connect();
          return;
        }

        if (this.lastToken) {
          this.connect(this.lastToken);
        }
      },
      state: () => (this.socket?.connected ? 'connected' : 'disconnected'),
    };
  }

  connect(token: string) {
    if (this.socket && this.currentToken === token) {
      this.socket.auth = {
        token,
      };
      if (!this.socket.connected && !this.socket.active) {
        this.socket.connect();
      }
      this.syncTestHandle();
      return this.socket;
    }

    this.disconnect();

    this.currentToken = token;
    this.lastToken = token;
    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      transports: ['websocket'],
      auth: {
        token,
      },
    });
    this.syncTestHandle();

    return this.socket;
  }

  get instance() {
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.currentToken = null;
    this.syncTestHandle();
  }

  emitWithAck<TPayload>(event: string, payload: TPayload) {
    return new Promise<SocketAck>((resolve, reject) => {
      if (!this.socket) {
        reject(new SocketTransportError('Socket chưa sẵn sàng.', 'SOCKET_NOT_CONNECTED', 'local'));
        return;
      }

      const timeout = window.setTimeout(() => {
        reject(new SocketTransportError('Socket ack timeout.', 'SOCKET_ACK_TIMEOUT', 'local'));
      }, 12_000);

      this.socket.emit(event, payload, (response: SocketAck) => {
        window.clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  async emitOrThrow<TPayload>(event: string, payload: TPayload) {
    const ack = await this.emitWithAck(event, payload);
    if (!ack.ok) {
      throw createSocketTransportError(ack);
    }
    return ack;
  }
}

export const chatSocketClient = new ChatSocketClient();
