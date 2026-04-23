import type { ProviderKey } from '../constants/providers';
import type { ChatMessage, ChatSessionSummary } from '../types/chat';

export interface SocketAck {
  ok: boolean;
  requestId: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    syncedCount?: number;
    cursor?: string;
  };
}

export interface JoinSessionPayload {
  sessionId: string;
}

export interface SendMessagePayload {
  sessionId: string;
  clientMessageId: string;
  message: string;
  provider?: ProviderKey;
}

export interface RetryMessagePayload {
  sessionId: string;
  clientMessageId: string;
  message?: string;
  provider?: ProviderKey;
}

export interface SyncStatePayload {
  sessionId: string;
  // ISO timestamp cursor based on the latest message update seen by the client.
  since?: string;
}

export interface MessageAcceptedEvent {
  sessionId: string;
  message: ChatMessage;
}

export interface MessageReceivedEvent {
  sessionId: string;
  message: ChatMessage;
}

export interface AIStartedEvent {
  sessionId: string;
  clientMessageId: string;
  provider: ProviderKey;
  model: string;
}

export interface AIChunkEvent {
  sessionId: string;
  clientMessageId: string;
  chunk: string;
  provider: ProviderKey;
  model: string;
}

export interface AIDoneEvent {
  sessionId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface MessageFailedEvent {
  sessionId: string;
  clientMessageId: string;
  error: {
    code: string;
    message: string;
  };
}

export interface SessionUpdatedEvent {
  session: ChatSessionSummary;
}
