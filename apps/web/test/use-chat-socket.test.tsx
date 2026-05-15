import type { ReactNode } from 'react';

import type { ChatAskResponse, ChatMessage } from '@chatbot-ai/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EventHandler = (...args: unknown[]) => void;

interface MockSocket {
  active: boolean;
  auth?: { token: string };
  connected: boolean;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emitEvent: (event: string, ...args: unknown[]) => void;
  io: {
    emitEvent: (event: string, ...args: unknown[]) => void;
    off: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  };
  off: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

const socketTestState = vi.hoisted(() => {
  const state = {
    askViaHttp: vi.fn(),
    currentSocket: null as MockSocket | null,
    socketClientMock: null as {
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      emitOrThrow: ReturnType<typeof vi.fn>;
      readonly instance: MockSocket | null;
    } | null,
  };

  state.socketClientMock = {
    connect: vi.fn((token: string) => {
      if (!state.currentSocket) {
        throw new Error('Mock socket not initialized');
      }

      state.currentSocket.auth = { token };
      return state.currentSocket;
    }),
    disconnect: vi.fn(() => {
      state.currentSocket?.disconnect('io client disconnect');
      state.currentSocket = null;
    }),
    emitOrThrow: vi.fn(async () => ({
      ok: true as const,
      requestId: 'socket-ack-1',
    })),
    get instance() {
      return state.currentSocket;
    },
  };

  return state;
});

vi.mock('../src/services/chat-service', () => ({
  askViaHttp: socketTestState.askViaHttp,
}));

vi.mock('../src/services/socket-client', () => ({
  chatSocketClient: socketTestState.socketClientMock,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

import { useChatSocket } from '../src/hooks/use-chat-socket';
import { useAuthStore } from '../src/store/auth-store';

const addHandler = (
  handlers: Map<string, Set<EventHandler>>,
  event: string,
  handler: EventHandler,
) => {
  const existing = handlers.get(event) ?? new Set<EventHandler>();
  existing.add(handler);
  handlers.set(event, existing);
};

const removeHandler = (
  handlers: Map<string, Set<EventHandler>>,
  event: string,
  handler: EventHandler,
) => {
  const existing = handlers.get(event);
  if (!existing) {
    return;
  }

  existing.delete(handler);
  if (existing.size === 0) {
    handlers.delete(event);
  }
};

const emitHandlers = (
  handlers: Map<string, Set<EventHandler>>,
  event: string,
  args: unknown[],
) => {
  const listeners = handlers.get(event);
  if (!listeners) {
    return;
  }

  [...listeners].forEach((listener) => {
    listener(...args);
  });
};

const createMockSocket = (input: { connected?: boolean; active?: boolean } = {}): MockSocket => {
  const socketHandlers = new Map<string, Set<EventHandler>>();
  const managerHandlers = new Map<string, Set<EventHandler>>();

  const socket: MockSocket = {
    active: input.active ?? false,
    connected: input.connected ?? false,
    connect: vi.fn(() => {
      socket.active = true;
      socket.connected = true;
      emitHandlers(socketHandlers, 'connect', []);
      return socket;
    }),
    disconnect: vi.fn((reason?: string) => {
      socket.active = false;
      socket.connected = false;
      emitHandlers(socketHandlers, 'disconnect', [reason ?? 'io client disconnect']);
      return socket;
    }),
    emitEvent: (event: string, ...args: unknown[]) => {
      emitHandlers(socketHandlers, event, args);
    },
    io: {
      emitEvent: (event: string, ...args: unknown[]) => {
        emitHandlers(managerHandlers, event, args);
      },
      off: vi.fn((event: string, handler: EventHandler) => {
        removeHandler(managerHandlers, event, handler);
        return socket.io;
      }),
      on: vi.fn((event: string, handler: EventHandler) => {
        addHandler(managerHandlers, event, handler);
        return socket.io;
      }),
    },
    off: vi.fn((event: string, handler: EventHandler) => {
      removeHandler(socketHandlers, event, handler);
      return socket;
    }),
    on: vi.fn((event: string, handler: EventHandler) => {
      addHandler(socketHandlers, event, handler);
      return socket;
    }),
  };

  return socket;
};

const buildMessage = (
  input: Partial<ChatMessage> &
    Pick<ChatMessage, 'sessionId' | 'clientMessageId' | 'senderType' | 'content' | 'status'>,
): ChatMessage => {
  const now = new Date('2026-05-15T00:00:00.000Z').toISOString();
  return {
    id: input.id ?? input.clientMessageId,
    sessionId: input.sessionId,
    clientMessageId: input.clientMessageId,
    parentClientMessageId: input.parentClientMessageId ?? null,
    senderType: input.senderType,
    content: input.content,
    status: input.status,
    provider: input.provider ?? null,
    model: input.model ?? null,
    providerRequestId: input.providerRequestId ?? null,
    modelVersionId: input.modelVersionId ?? null,
    aiRuntimeMode: input.aiRuntimeMode ?? null,
    learningEngineUsed: input.learningEngineUsed ?? false,
    externalFallbackUsed: input.externalFallbackUsed ?? false,
    responseFinishReason: input.responseFinishReason ?? null,
    latencyMs: input.latencyMs ?? null,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    totalTokens: input.totalTokens ?? null,
    confidenceScore: input.confidenceScore ?? null,
    confidenceLevel: input.confidenceLevel ?? null,
    subjectLabel: input.subjectLabel ?? null,
    topicLabel: input.topicLabel ?? null,
    levelLabel: input.levelLabel ?? null,
    fallbackUsed: input.fallbackUsed ?? false,
    fallbackInfo: input.fallbackInfo ?? null,
    retrievalSnapshot: input.retrievalSnapshot ?? null,
    errorCode: input.errorCode ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

const buildFallbackResponse = (sessionId: string, clientMessageId: string): ChatAskResponse => ({
  userMessage: buildMessage({
    sessionId,
    clientMessageId,
    senderType: 'user',
    content: 'Explain OOP',
    status: 'sent',
  }),
  assistantMessage: buildMessage({
    sessionId,
    clientMessageId: `${clientMessageId}:assistant`,
    parentClientMessageId: clientMessageId,
    senderType: 'assistant',
    content: 'Fallback response',
    status: 'sent',
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
  }),
  ai: {
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
    modelVersionId: null,
    aiRuntimeMode: 'external_api',
    learningEngineUsed: false,
    externalFallbackUsed: false,
    contentMarkdown: 'Fallback response',
    finishReason: 'stop',
    usage: {},
    latencyMs: 100,
    fallbackUsed: true,
    fallbackInfo: null,
    warnings: [],
    retrievalSnapshot: null,
    confidenceScore: null,
    confidenceLevel: null,
    subjectLabel: null,
    topicLabel: null,
    levelLabel: null,
  },
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const setAuthState = (input: { accessToken: string | null; bootstrapped: boolean }) => {
  useAuthStore.setState({
    accessToken: input.accessToken,
    bootstrapped: input.bootstrapped,
    refreshToken: input.accessToken ? 'refresh-token' : null,
    user: input.accessToken
      ? {
          id: 'user-1',
          displayName: 'Socket Tester',
          preferredLanguage: 'bilingual',
          createdAt: '2026-05-15T00:00:00.000Z',
        }
      : null,
  });
};

describe('useChatSocket', () => {
  beforeEach(() => {
    socketTestState.currentSocket = null;
    localStorage.clear();
    socketTestState.askViaHttp.mockReset();
    socketTestState.askViaHttp.mockResolvedValue(buildFallbackResponse('session-1', 'client-1'));
    socketTestState.socketClientMock?.connect.mockClear();
    socketTestState.socketClientMock?.disconnect.mockClear();
    socketTestState.socketClientMock?.emitOrThrow.mockClear();
    socketTestState.socketClientMock?.emitOrThrow.mockResolvedValue({
      ok: true,
      requestId: 'socket-ack-1',
    });
    setAuthState({ accessToken: null, bootstrapped: false });
  });

  afterEach(() => {
    socketTestState.currentSocket = null;
  });

  it('does not connect before auth bootstrap completes', () => {
    socketTestState.currentSocket = createMockSocket();
    setAuthState({ accessToken: 'access-token', bootstrapped: false });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatSocket('session-1'), { wrapper });

    expect(socketTestState.socketClientMock?.connect).not.toHaveBeenCalled();
    expect(result.current.connectionState).toBe('disconnected');
  });

  it('marks the socket as connected when the instance is already connected before listeners attach', async () => {
    socketTestState.currentSocket = createMockSocket({ connected: true, active: true });
    setAuthState({ accessToken: 'access-token', bootstrapped: true });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatSocket('session-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    await waitFor(() => {
      expect(socketTestState.socketClientMock?.emitOrThrow).toHaveBeenCalledWith('chat:join_session', {
        sessionId: 'session-1',
      });
      expect(socketTestState.socketClientMock?.emitOrThrow).toHaveBeenCalledWith('chat:sync_state', {
        sessionId: 'session-1',
        since: undefined,
      });
    });
  });

  it('updates the connection state to disconnected only after a real disconnect event', async () => {
    socketTestState.currentSocket = createMockSocket({ connected: true, active: true });
    setAuthState({ accessToken: 'access-token', bootstrapped: true });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatSocket('session-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    act(() => {
      socketTestState.currentSocket?.emitEvent('disconnect', 'transport close');
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('disconnected');
    });
  });

  it('uses HTTP fallback when the socket is unavailable', async () => {
    socketTestState.currentSocket = createMockSocket({ connected: false, active: false });
    setAuthState({ accessToken: 'access-token', bootstrapped: true });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatSocket('session-1'), { wrapper });

    await act(async () => {
      await result.current.sendMessage({
        sessionId: 'session-1',
        clientMessageId: 'client-1',
        message: 'Explain OOP',
      });
    });

    expect(socketTestState.askViaHttp).toHaveBeenCalledWith({
      sessionId: 'session-1',
      clientMessageId: 'client-1',
      message: 'Explain OOP',
    });
  });

  it('joins the selected session again when the session changes', async () => {
    socketTestState.currentSocket = createMockSocket({ connected: true, active: true });
    setAuthState({ accessToken: 'access-token', bootstrapped: true });

    const wrapper = createWrapper();
    const { rerender } = renderHook(
      ({ currentSessionId }) => useChatSocket(currentSessionId),
      {
        initialProps: { currentSessionId: 'session-1' as string | null },
        wrapper,
      },
    );

    await waitFor(() => {
      expect(socketTestState.socketClientMock?.emitOrThrow).toHaveBeenCalledWith('chat:join_session', {
        sessionId: 'session-1',
      });
    });

    socketTestState.socketClientMock?.emitOrThrow.mockClear();

    rerender({ currentSessionId: 'session-2' });

    await waitFor(() => {
      expect(socketTestState.socketClientMock?.emitOrThrow).toHaveBeenCalledWith('chat:join_session', {
        sessionId: 'session-2',
      });
      expect(socketTestState.socketClientMock?.emitOrThrow).toHaveBeenCalledWith('chat:sync_state', {
        sessionId: 'session-2',
        since: undefined,
      });
    });
  });

  it('reuses the same socket instance on rerender with the same token', async () => {
    const sharedSocket = createMockSocket({ connected: true, active: true });
    socketTestState.currentSocket = sharedSocket;
    setAuthState({ accessToken: 'access-token', bootstrapped: true });

    const wrapper = createWrapper();
    const { rerender } = renderHook(
      ({ currentSessionId }) => useChatSocket(currentSessionId),
      {
        initialProps: { currentSessionId: 'session-1' as string | null },
        wrapper,
      },
    );

    await waitFor(() => {
      expect(socketTestState.socketClientMock?.connect).toHaveBeenCalled();
    });

    rerender({ currentSessionId: 'session-1' });

    const returnedSockets =
      socketTestState.socketClientMock?.connect.mock.results.map((result) => result.value) ?? [];

    expect(returnedSockets.length).toBeGreaterThan(0);
    returnedSockets.forEach((socket) => {
      expect(socket).toBe(sharedSocket);
    });
  });
});
