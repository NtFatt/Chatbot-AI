import { useEffect, useMemo, useState } from 'react';

import type { ChatMessage, ChatSessionSummary, PaginatedResponse, ProviderKey } from '@chatbot-ai/shared';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { askViaHttp } from '../services/chat-service';
import { chatSocketClient } from '../services/socket-client';
import { useAuthStore } from '../store/auth-store';
import { queryKeys } from '../utils/query-keys';

type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

const assistantClientId = (clientMessageId: string) => `${clientMessageId}:assistant`;

const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));

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
    senderType: input.senderType,
    content: input.content,
    status: input.status,
    provider: input.provider ?? null,
    model: input.model ?? null,
    latencyMs: input.latencyMs ?? null,
    errorCode: input.errorCode ?? null,
    createdAt: now,
    updatedAt: now,
  };
};

export const useChatSocket = (sessionId: string | null) => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  const socket = useMemo(() => {
    if (!accessToken) {
      return null;
    }

    return chatSocketClient.connect(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!socket) {
      setConnectionState('disconnected');
      return;
    }

    const handleConnect = () => setConnectionState('connected');
    const handleDisconnect = () => setConnectionState('disconnected');
    const handleReconnectAttempt = () => setConnectionState('reconnecting');

    const handleMessageAccepted = (event: { sessionId: string; message: ChatMessage }) => {
      queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
        queryKeys.messages(event.sessionId),
        (previous) => updateMessageList(previous, (items) => upsertMessage(items, event.message)),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    };

    const handleMessageReceived = (event: { sessionId: string; message: ChatMessage }) => {
      queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
        queryKeys.messages(event.sessionId),
        (previous) => updateMessageList(previous, (items) => upsertMessage(items, event.message)),
      );
    };

    const handleAIStarted = (event: {
      sessionId: string;
      clientMessageId: string;
      provider: ProviderKey;
      model: string;
    }) => {
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

    const handleAIChunk = (event: {
      sessionId: string;
      clientMessageId: string;
      chunk: string;
      provider: ProviderKey;
      model: string;
    }) => {
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
              }),
            );
          }),
      );
    };

    const handleAIDone = (event: {
      sessionId: string;
      userMessage: ChatMessage;
      assistantMessage: ChatMessage;
    }) => {
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
    };

    const handleMessageFailed = (event: {
      sessionId: string;
      clientMessageId: string;
      error: { code: string; message: string };
    }) => {
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
      toast.error(event.error.message);
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

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('chat:message_accepted', handleMessageAccepted);
    socket.on('chat:message_received', handleMessageReceived);
    socket.on('chat:ai_started', handleAIStarted);
    socket.on('chat:ai_chunk', handleAIChunk);
    socket.on('chat:ai_done', handleAIDone);
    socket.on('chat:message_failed', handleMessageFailed);
    socket.on('chat:session_updated', handleSessionUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('chat:message_accepted', handleMessageAccepted);
      socket.off('chat:message_received', handleMessageReceived);
      socket.off('chat:ai_started', handleAIStarted);
      socket.off('chat:ai_chunk', handleAIChunk);
      socket.off('chat:ai_done', handleAIDone);
      socket.off('chat:message_failed', handleMessageFailed);
      socket.off('chat:session_updated', handleSessionUpdated);
    };
  }, [queryClient, socket]);

  useEffect(() => {
    if (!socket || !sessionId) {
      return;
    }

    const latestMessage = queryClient.getQueryData<PaginatedResponse<ChatMessage>>(
      queryKeys.messages(sessionId),
    )?.items.at(-1);

    void chatSocketClient.emitWithAck('chat:join_session', { sessionId }).catch(() => undefined);
    void chatSocketClient
      .emitWithAck('chat:sync_state', {
        sessionId,
        since: latestMessage?.createdAt,
      })
      .catch(() => undefined);
  }, [queryClient, sessionId, socket]);

  const sendMessage = async (input: {
    sessionId: string;
    clientMessageId: string;
    message: string;
    provider?: ProviderKey;
  }) => {
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
      const ack = await chatSocketClient.emitWithAck('chat:send_message', input);
      if (!ack.ok) {
        throw new Error(ack.error?.message ?? 'Unable to send message.');
      }
      return;
    }

    const fallback = await askViaHttp(input);
    queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
      queryKeys.messages(input.sessionId),
      (previous) =>
        updateMessageList(previous, (items) =>
          upsertMessage(upsertMessage(items, fallback.userMessage), fallback.assistantMessage),
        ),
    );
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

          return assistant
            ? upsertMessage(items, {
                ...assistant,
                content: '',
                status: 'streaming',
                errorCode: null,
              })
            : items;
        }),
    );

    if (socket?.connected) {
      const ack = await chatSocketClient.emitWithAck('chat:retry_message', {
        sessionId: input.sessionId,
        clientMessageId: input.clientMessageId,
        provider: input.provider,
      });

      if (!ack.ok) {
        throw new Error(ack.error?.message ?? 'Unable to retry message.');
      }
      return;
    }

    const fallback = await askViaHttp(input);
    queryClient.setQueryData<PaginatedResponse<ChatMessage>>(
      queryKeys.messages(input.sessionId),
      (previous) =>
        updateMessageList(previous, (items) =>
          upsertMessage(upsertMessage(items, fallback.userMessage), fallback.assistantMessage),
        ),
    );
  };

  return {
    connectionState,
    sendMessage,
    retryMessage,
  };
};
