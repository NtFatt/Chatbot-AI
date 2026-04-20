import type { SocketAck } from '@chatbot-ai/shared';
import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

class ChatSocketClient {
  private socket: Socket | null = null;
  private currentToken: string | null = null;

  connect(token: string) {
    if (this.socket && this.currentToken === token) {
      return this.socket;
    }

    this.disconnect();

    this.currentToken = token;
    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      transports: ['websocket'],
      auth: {
        token,
      },
    });

    return this.socket;
  }

  get instance() {
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.currentToken = null;
  }

  emitWithAck<TPayload>(event: string, payload: TPayload) {
    return new Promise<SocketAck>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket is not connected.'));
        return;
      }

      const timeout = window.setTimeout(() => {
        reject(new Error('Socket ack timeout.'));
      }, 12_000);

      this.socket.emit(event, payload, (response: SocketAck) => {
        window.clearTimeout(timeout);
        resolve(response);
      });
    });
  }
}

export const chatSocketClient = new ChatSocketClient();
