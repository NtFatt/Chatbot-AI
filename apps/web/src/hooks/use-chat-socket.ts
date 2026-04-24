import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  AIChunkEvent,
  AIDoneEvent,
  AIStartedEvent,
  ChatMessage,
  ChatSessionSummary,
  MessageAcceptedEvent,
  MessageFailedEvent,
  PaginatedResponse,
  ProviderKey,
  SendMessagePayload,
} from '@chatbot-ai/shared';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { askViaHttp } from '../services/chat-service';
import { chatSocketClient } from '../services/socket-client';
import { useAuthStore } from '../store/auth-store';
import { getTransportErrorInfo } from '../utils/transport-errors';
import { queryKeys } from '../utils/query-keys';

type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';
type RecoveryState = 'idle' | 'syncing' | 'error';

const assistantClientId = (clientMessageId: string) => `${clientMessageId}:assistant`;

const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort((left, right) => {
    if (left.parentClientMessageId === right.clientMessageId) {
      return 1;
    }

    if (right.parentClientMessageId === left.clientMessageId) {
      return -1;
    }

    const createdComparison = left.createdAt.localeCompare(right.createdAt);
    if (createdComparison !== 0) {
      return createdComparison;
    }

    if (left.senderType !== right.senderType) {
      return left.senderType === 'user' ? -1 : 1;
    }

    return left.clientMessageId.localeCompare(right.clientMessageId);
  });

const upsertMessage = (items: ChatMessage[], next: ChatMessage) => {
  const index = items.findIndex(
    (item) => item.clientMessageId === next.clientMessageId || item.id === next.id,
  );

  if (index === -1) {
    return sortMessages([...items, next]);
  }

  const clone = [...items];
  clone[index] = next;
  return sortMessages(clone);
};

const updateMessageList = (
  previous: PaginatedResponse<ChatMessage> | undefined,
  updater: (items: ChatMessage[]) => ChatMessage[],
): PaginatedResponse<ChatMessage> => {
  const items = previous?.items ?? [];
  const nextItems = updater(items);
  return {
    items: nextItems,
    total: nextItems.length,
  };
};

const optimisticMessage = (
  input: Partial<ChatMessage> &
    Pick<ChatMessage, 'sessionId' | 'clientMessageId' | 'senderType' | 'content' | 'status'>,
): ChatMessage => {
  const now = new Date().toISOString();
  return {
    id: input.clientMessageId,
    sessionId: input.sessionId,
    clientMessageId: input.clientMessageId,
    parentClientMessageId: input.parentClientMessageId ?? null,
    senderType: input.senderType,
    content: input.content,
    status: input.status,
    provider: input.provider ?? null,
    model: input.model ?? null,
    providerRequestId: input.providerRequestId ?? null,
    responseFinishReason: input.responseFinishReason ?? null,
    latencyMs: input.latencyMs ?? null,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    totalTokens: input.totalTokens ?? null,
    fallbackUsed: input.fallbackUsed ?? false,
    retrievalSnapshot: input.retrievalSnapshot ?? null,
    errorCode: input.errorCode ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

const getLatestSyncCursor = (messages: ChatMessage[]) =>
  messages.reduce<string | undefined>((cursor, message) => {
    const candidate = message.updatedAt || message.createdAt;
    if (!cursor || candidate > cursor) {
      return candidate;
    }
    return cursor;
  }, undefined);

export const useChatSocket = (sessionId: string | null) => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('idle');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(sessionId);

  const socket = useMemo(() => {
    if (!accessToken) {
      return null;
    }

    return chatSocketClient.connect(accessToken);
  }, [accessToken]);

  useEffect(() => {
    activeSessionIdRef.current = sessionId;
  }, [sessionId]);

  const markStreamingMessagesForRecovery = (targetSessionId: string) => {
    queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
      queryKeys.messages(targetSessionId),
      (previous) =>
        updateMessageList(previous, (items) =>
          items.map((message) =>
            message.status === 'streaming'
              ? {
                  ...message,
                  status: 'needs_sync',
                }
              : message,
          ),
        ),
    );
  };

  const restoreRecoveringMessages = (targetSessionId: string) => {
    queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
      queryKeys.messages(targetSessionId),
      (previous) =>
        updateMessageList(previous, (items) =>
          items.map((message) =>
            message.status === 'needs_sync'
              ? {
                  ...message,
                  status: 'streaming',
                }
              : message,
          ),
        ),
    );
  };

  const markRequestFailed = (targetSessionId: string, clientMessageId: string, errorCode?: string) => {
    queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
      queryKeys.messages(targetSessionId),
      (previous) =>
        updateMessageList(previous, (items) =>
          items.map((message) => {
            if (
              message.clientMessageId === clientMessageId ||
              message.clientMessageId === assistantClientId(clientMessageId)
            ) {
              return {
                ...message,
                status: 'failed',
                errorCode: errorCode ?? message.errorCode,
              };
            }

            return message;
          }),
        ),
    );
  };

  const runSessionRecovery = async (targetSessionId: string) => {
    if (!socket?.connected) {
      return;
    }

    setRecoveryState('syncing');
    setRecoveryError(null);

    try {
      const messages =
        queryClient.getQueryData<PaginatedResponse<ChatMessage>>(queryKeys.messages(targetSessionId))
          ?.items ?? [];
      const since = getLatestSyncCursor(messages);

      await chatSocketClient.emitOrThrow('chat:join_session', { sessionId: targetSessionId });
      await chatSocketClient.emitOrThrow('chat:sync_state', {
        sessionId: targetSessionId,
        since,
      });

      restoreRecoveringMessages(targetSessionId);
      setRecoveryState('idle');
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Không thể đồng bộ lại phiên chat.');
      setRecoveryError(info.message);
      setRecoveryState('error');
    }
  };

  useEffect(() => {
    if (!socket) {
      setConnectionState('disconnected');
      setRecoveryState('idle');
      setRecoveryError(null);
      return;
    }

    const handleConnect = () => {
      setConnectionState('connected');
      const nextSessionId = activeSessionIdRef.current;
      if (nextSessionId) {
        void runSessionRecovery(nextSessionId);
      }
    };

    const handleDisconnect = () => {
      setConnectionState('disconnected');
      const nextSessionId = activeSessionIdRef.current;
      if (nextSessionId) {
        markStreamingMessagesForRecovery(nextSessionId);
      }
    };

    const handleReconnectAttempt = () => {
      setConnectionState('reconnecting');
    };

    const handleConnectError = () => {
      setConnectionState('disconnected');
    };

    const handleMessageAccepted = (event: MessageAcceptedEvent) => {
      queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
        queryKeys.messages(event.sessionId),
        (previous) => updateMessageList(previous, (items) => upsertMessage(items, event.message)),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    };

    const handleMessageReceived = (event: MessageAcceptedEvent) => {
      queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
        queryKeys.messages(event.sessionId),
        (previous) => updateMessageList(previous, (items) => upsertMessage(items, event.message)),
      );
    };

    const handleAIStarted = (event: AIStartedEvent) => {
      queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
        queryKeys.messages(event.sessionId),
        (previous) =>
          updateMessageList(previous, (items) =>
            upsertMessage(
              items,
              optimisticMessage({
                sessionId: event.sessionId,
                clientMessageId: assistantClientId(event.clientMessageId),
                senderType: 'assistant',
                content: '',
                status: 'streaming',
                provider: event.provider,
                model: event.model,
              }),
            ),
          ),
      );
    };

    const handleAIChunk = (event: AIChunkEvent) => {
      queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
        queryKeys.messages(event.sessionId),
        (previous) =>
          updateMessageList(previous, (items) => {
            const targetClientId = assistantClientId(event.clientMessageId);
            const target = items.find((item) => item.clientMessageId === targetClientId);

            return upsertMessage(
              items,
              optimisticMessage({
                ...(target ?? {}),
                sessionId: event.sessionId,
                clientMessageId: targetClientId,
                senderType: 'assistant',
                content: `${target?.content ?? ''}${event.chunk}`,
                status: 'streaming',
                provider: event.provider,
                model: event.model,
                createdAt: target?.createdAt,
                updatedAt: new Date().toISOString(),
              }),
            );
          }),
      );
    };

    const handleAIDone = (event: AIDoneEvent) => {
      queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
        queryKeys.messages(event.sessionId),
        (previous) =>
          updateMessageList(previous, (items) =>
            upsertMessage(upsertMessage(items, event.userMessage), event.assistantMessage),
          ),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recommendations(event.sessionId, ''),
        exact: false,
      });
      setRecoveryState('idle');
      setRecoveryError(null);
    };

    const handleMessageFailed = (event: MessageFailedEvent) => {
      queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
        queryKeys.messages(event.sessionId),
        (previous) =>
          updateMessageList(previous, (items) => {
            const target = items.find(
              (item) => item.clientMessageId === assistantClientId(event.clientMessageId),
            );

            return target
              ? upsertMessage(items, {
                  ...target,
                  status: 'failed',
                  errorCode: event.error.code,
                })
              : items;
          }),
      );
      const info = getTransportErrorInfo(
        {
          message: event.error.message,
        },
        event.error.message,
      );
      toast.error(info.message, {
        description: event.error.code ? `Mã lỗi: ${event.error.code}` : undefined,
      });
    };

    const handleSessionUpdated = (event: { session: ChatSessionSummary }) => {
      queryClient.setQueryData<PaginatedResponse<ChatSessionSummary>>(
        queryKeys.sessions,
        (previous) => {
          const items = previous?.items ?? [];
          const index = items.findIndex((item) => item.id === event.session.id);
          const nextItems = [...items];

          if (index === -1) {
            nextItems.unshift(event.session);
          } else {
            nextItems[index] = { ...nextItems[index], ...event.session };
          }

          return {
            items: nextItems.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
            total: nextItems.length,
          };
        },
      );
    };

    const handleChatError = (event: { code?: string; message?: string }) => {
      toast.error(event.message ?? 'Kết nối realtime vừa gặp lỗi.', {
        description: event.code ? `Mã lỗi: ${event.code}` : undefined,
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('chat:message_accepted', handleMessageAccepted);
    socket.on('chat:message_received', handleMessageReceived);
    socket.on('chat:ai_started', handleAIStarted);
    socket.on('chat:ai_chunk', handleAIChunk);
    socket.on('chat:ai_done', handleAIDone);
    socket.on('chat:message_failed', handleMessageFailed);
    socket.on('chat:session_updated', handleSessionUpdated);
    socket.on('chat:error', handleChatError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('chat:message_accepted', handleMessageAccepted);
      socket.off('chat:message_received', handleMessageReceived);
      socket.off('chat:ai_started', handleAIStarted);
      socket.off('chat:ai_chunk', handleAIChunk);
      socket.off('chat:ai_done', handleAIDone);
      socket.off('chat:message_failed', handleMessageFailed);
      socket.off('chat:session_updated', handleSessionUpdated);
      socket.off('chat:error', handleChatError);
    };
  }, [queryClient, socket]);

  useEffect(() => {
    if (!socket || !sessionId || !socket.connected) {
      return;
    }

    void runSessionRecovery(sessionId);
  }, [queryClient, sessionId, socket]);

  const sendMessage = async (input: SendMessagePayload) => {
    const optimisticUser = optimisticMessage({
      sessionId: input.sessionId,
      clientMessageId: input.clientMessageId,
      senderType: 'user',
      content: input.message,
      status: 'sending',
    });
    const optimisticAssistant = optimisticMessage({
      sessionId: input.sessionId,
      clientMessageId: assistantClientId(input.clientMessageId),
      senderType: 'assistant',
      content: '',
      status: 'streaming',
    });

    queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
      queryKeys.messages(input.sessionId),
      (previous) =>
        updateMessageList(previous, (items) =>
          upsertMessage(upsertMessage(items, optimisticUser), optimisticAssistant),
        ),
    );

    if (socket?.connected) {
      try {
        await chatSocketClient.emitOrThrow('chat:send_message', input);
        return;
      } catch (error) {
        const info = getTransportErrorInfo(error, 'Không thể gửi câu hỏi lúc này.');
        markRequestFailed(input.sessionId, input.clientMessageId, info.code);
        throw error;
      }
    }

    try {
      const fallback = await askViaHttp(input);
      queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
        queryKeys.messages(input.sessionId),
        (previous) =>
          updateMessageList(previous, (items) =>
            upsertMessage(upsertMessage(items, fallback.userMessage), fallback.assistantMessage),
          ),
      );
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Không thể gửi câu hỏi lúc này.');
      markRequestFailed(input.sessionId, input.clientMessageId, info.code);
      throw error;
    }
  };

  const retryMessage = async (input: {
    sessionId: string;
    clientMessageId: string;
    message: string;
    provider?: ProviderKey;
  }) => {
    queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
      queryKeys.messages(input.sessionId),
      (previous) =>
        updateMessageList(previous, (items) => {
          const assistant = items.find(
            (item) => item.clientMessageId === assistantClientId(input.clientMessageId),
          );
          const user = items.find((item) => item.clientMessageId === input.clientMessageId);

          let nextItems = items;

          if (assistant) {
            nextItems = upsertMessage(nextItems, {
              ...assistant,
              content: '',
              status: 'streaming',
              errorCode: null,
            });
          }

          if (user) {
            nextItems = upsertMessage(nextItems, {
              ...user,
              status: 'sending',
              errorCode: null,
            });
          }

          return nextItems;
        }),
    );

    if (socket?.connected) {
      try {
        await chatSocketClient.emitOrThrow('chat:retry_message', {
          sessionId: input.sessionId,
          clientMessageId: input.clientMessageId,
          message: input.message,
          provider: input.provider,
        });
        return;
      } catch (error) {
        const info = getTransportErrorInfo(error, 'Chưa thể gửi lại câu hỏi này.');
        markRequestFailed(input.sessionId, input.clientMessageId, info.code);
        throw error;
      }
    }

    try {
      const fallback = await askViaHttp(input);
      queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
        queryKeys.messages(input.sessionId),
        (previous) =>
          updateMessageList(previous, (items) =>
            upsertMessage(upsertMessage(items, fallback.userMessage), fallback.assistantMessage),
          ),
      );
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Chưa thể gửi lại câu hỏi này.');
      markRequestFailed(input.sessionId, input.clientMessageId, info.code);
      throw error;
    }
  };

  return {
    connectionState,
    recoveryError,
    recoveryState,
    sendMessage,
    retryMessage,
  };
};
