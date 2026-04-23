import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';

import type { ChatMessage, ChatSessionSummary, ProviderKey } from '@chatbot-ai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ChatComposer } from '../../components/chat/ChatComposer';
import { ChatMessageBubble } from '../../components/chat/ChatMessageBubble';
import { SessionSidebar } from '../../components/layout/SessionSidebar';
import { WorkspaceSettingsSheet } from '../../components/layout/WorkspaceSettingsSheet';
import { useChatSocket } from '../../hooks/use-chat-socket';
import {
  createSession,
  deleteSession,
  fetchMessages,
  fetchSessions,
  updateSession,
} from '../../services/chat-service';
import { logout } from '../../services/auth-service';
import { recommendMaterials } from '../../services/materials-service';
import { fetchProviders, testProviders } from '../../services/providers-service';
import { useAuthStore } from '../../store/auth-store';
import { useUiStore } from '../../store/ui-store';
import { getTransportErrorInfo, toPanelError } from '../../utils/transport-errors';
import { queryKeys } from '../../utils/query-keys';

const createClientMessageId = () => crypto.randomUUID();

export const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const selectedSessionId = useUiStore((state) => state.selectedSessionId);
  const setSelectedSessionId = useUiStore((state) => state.setSelectedSessionId);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const [resourceSearch, setResourceSearch] = useState('');
  const deferredSearch = useDeferredValue(resourceSearch);
  const [draftTitle, setDraftTitle] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: fetchSessions,
  });
  const providersQuery = useQuery({
    queryKey: queryKeys.providers,
    queryFn: fetchProviders,
  });
  const providerDiagnosticsQuery = useQuery({
    enabled: settingsOpen,
    queryKey: ['providers-diagnostics'],
    queryFn: testProviders,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const messagesQuery = useQuery({
    enabled: Boolean(selectedSessionId),
    queryKey: selectedSessionId ? queryKeys.messages(selectedSessionId) : ['messages-disabled'],
    queryFn: () => fetchMessages(selectedSessionId!),
  });
  const recommendationsQuery = useQuery({
    enabled: Boolean(selectedSessionId),
    queryKey: selectedSessionId
      ? queryKeys.recommendations(selectedSessionId, deferredSearch)
      : ['recommendations-disabled'],
    queryFn: () =>
      recommendMaterials({
        sessionId: selectedSessionId!,
        q: deferredSearch || undefined,
        limit: 6,
      }),
  });

  const sessions = sessionsQuery.data?.items ?? [];
  const currentSession = sessions.find((session) => session.id === selectedSessionId) ?? null;
  const messages = messagesQuery.data?.items ?? [];
  const providerOptions =
    providersQuery.data?.providers.map((provider) => provider.key) ?? ['GEMINI', 'OPENAI'];
  const hasExternalProviders =
    (providersQuery.data?.providers.filter((provider) => provider.enabled).length ?? 0) > 0;
  const activeProvider = currentSession?.providerPreference ?? providersQuery.data?.defaultProvider ?? 'GEMINI';
  const recommendationsError = recommendationsQuery.error
    ? toPanelError(recommendationsQuery.error, 'Không tải được gợi ý tài liệu lúc này.')
    : null;
  const providerDiagnosticsError = providerDiagnosticsQuery.error
    ? toPanelError(providerDiagnosticsQuery.error, 'Không kiểm tra được trạng thái provider lúc này.')
    : null;
  const messagesError = messagesQuery.error
    ? toPanelError(messagesQuery.error, 'Hãy mở lại cuộc trò chuyện hoặc tải lại trang.')
    : null;
  const isStreaming = messages.some((message) => message.status === 'streaming');

  const { connectionState, recoveryError, recoveryState, retryMessage, sendMessage } = useChatSocket(
    selectedSessionId,
  );

  const createSessionMutation = useMutation({
    mutationFn: (providerPreference: ProviderKey) => createSession({ providerPreference }),
    onSuccess: (session) => {
      queryClient.setQueryData(
        queryKeys.sessions,
        (previous: { items: ChatSessionSummary[]; total: number } | undefined) => ({
          items: [session, ...(previous?.items ?? [])],
          total: (previous?.items.length ?? 0) + 1,
        }),
      );
      startTransition(() => {
        setSelectedSessionId(session.id);
      });
      setSidebarOpen(false);
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({
      sessionId,
      input,
    }: {
      sessionId: string;
      input: {
        title?: string;
        providerPreference?: ProviderKey;
      };
    }) => updateSession(sessionId, input),
    onSuccess: (session) => {
      queryClient.setQueryData(
        queryKeys.sessions,
        (previous: { items: ChatSessionSummary[]; total: number } | undefined) => ({
          items: (previous?.items ?? []).map((item) => (item.id === session.id ? { ...item, ...session } : item)),
          total: previous?.total ?? 0,
        }),
      );
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_response, sessionId) => {
      queryClient.setQueryData(
        queryKeys.sessions,
        (previous: { items: ChatSessionSummary[]; total: number } | undefined) => {
          const items = (previous?.items ?? []).filter((item) => item.id !== sessionId);
          return {
            items,
            total: items.length,
          };
        },
      );
      if (selectedSessionId === sessionId) {
        startTransition(() => {
          setSelectedSessionId(sessions.find((item) => item.id !== sessionId)?.id ?? null);
        });
      }
    },
  });

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      startTransition(() => {
        setSelectedSessionId(sessions[0]!.id);
      });
    }
  }, [selectedSessionId, sessions, setSelectedSessionId]);

  useEffect(() => {
    setDraftTitle(currentSession?.title ?? '');
  }, [currentSession?.title]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logout(refreshToken);
      }
    } catch {
      // Ignore transport errors on logout.
    } finally {
      clearSession();
      queryClient.clear();
      await navigate('/login');
    }
  };

  const handleSend = async (message: string) => {
    if (!selectedSessionId) {
      toast.error('Hãy tạo một cuộc trò chuyện trước khi gửi câu hỏi.');
      return;
    }

    try {
      await sendMessage({
        sessionId: selectedSessionId,
        clientMessageId: createClientMessageId(),
        message,
        provider: activeProvider,
      });
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Không thể gửi câu hỏi lúc này.');
      toast.error(info.message, {
        description: info.description,
      });
    }
  };

  const handleSaveTitle = () => {
    if (!currentSession) {
      return;
    }

    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === currentSession.title) {
      return;
    }

    updateSessionMutation.mutate({
      sessionId: currentSession.id,
      input: { title: nextTitle },
    });
  };

  const handleRetry = async (assistantMessage: ChatMessage) => {
    const userMessageId = assistantMessage.clientMessageId.replace(':assistant', '');
    const userMessage = messages.find((message) => message.clientMessageId === userMessageId);
    if (!userMessage || !selectedSessionId) {
      toast.error('Không tìm lại được câu hỏi gốc để thử gửi lại.');
      return;
    }

    try {
      await retryMessage({
        sessionId: selectedSessionId,
        clientMessageId: userMessage.clientMessageId,
        message: userMessage.content,
        provider: activeProvider,
      });
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Thử gửi lại chưa thành công.');
      toast.error(info.message, {
        description: info.description,
      });
    }
  };

  return (
    <div className="h-screen overflow-hidden px-2 py-2 sm:px-3 sm:py-3">
      <div className="mx-auto grid h-full min-h-0 max-w-[1920px] gap-2 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className={`${sidebarOpen ? 'block min-h-0' : 'hidden'} xl:block xl:min-h-0`}>
          <SessionSidebar
            activeSessionId={selectedSessionId}
            onCreate={() => createSessionMutation.mutate(activeProvider)}
            onDelete={(sessionId) => deleteSessionMutation.mutate(sessionId)}
            onOpenSettings={() => setSettingsOpen(true)}
            onSelect={(sessionId) => {
              startTransition(() => setSelectedSessionId(sessionId));
              setSidebarOpen(false);
            }}
            sessions={sessions}
          />
        </div>

        <main className="min-h-0 overflow-hidden">
          <div className="glass-panel relative flex h-full min-h-0 w-full flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
            <button
              className="focus-ring absolute left-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/88 shadow-soft xl:hidden dark:border-white/10 dark:bg-slate-900/88"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              type="button"
            >
              <Menu className="h-4 w-4" />
            </button>

            {currentSession && (connectionState !== 'connected' || recoveryState !== 'idle') ? (
              <div
                className="mb-2 shrink-0 rounded-[18px] border border-black/8 bg-white/82 px-4 py-3 text-sm leading-6 dark:border-white/10 dark:bg-slate-900/72"
                data-testid="connection-banner"
              >
                <p className="font-medium">
                  {connectionState === 'reconnecting'
                    ? 'Đang kết nối lại realtime'
                    : connectionState === 'disconnected'
                      ? 'Realtime đang gián đoạn'
                      : recoveryState === 'syncing'
                        ? 'Đang đồng bộ lại phiên chat'
                        : 'Cần kiểm tra lại trạng thái kết nối'}
                </p>
                <p className="mt-1 text-ink/65 dark:text-slate-300">
                  {connectionState === 'connected'
                    ? 'Các tin nhắn gần nhất đang được đối chiếu lại để tránh thiếu hoặc trùng dữ liệu.'
                    : 'Bạn vẫn có thể gửi qua chế độ dự phòng HTTP, nhưng lịch sử realtime sẽ được đồng bộ lại khi kết nối ổn định.'}
                </p>
                {recoveryError ? (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-300">{recoveryError}</p>
                ) : null}
              </div>
            ) : null}

            <div
              className="app-scrollbar min-h-0 flex-1 overflow-y-auto pb-4 pr-1.5 pt-12 xl:pt-1"
              data-testid="chat-messages"
              ref={messagesViewportRef}
            >
              {!messagesQuery.isLoading && messagesError ? (
                <div className="mb-4 rounded-[24px] border border-red-500/20 bg-red-500/5 px-4 py-4 text-sm dark:border-red-500/25">
                  <p className="font-medium text-red-600 dark:text-red-300">Không tải được lịch sử tin nhắn</p>
                  <p className="mt-2 leading-6 text-ink/72 dark:text-slate-300">{messagesError.message}</p>
                  {messagesError.meta ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink/48 dark:text-slate-500">
                      {messagesError.meta}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {messagesQuery.isLoading ? (
                <div className="w-full space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      className={`h-24 animate-pulse rounded-[26px] bg-black/5 dark:bg-white/5 ${index % 2 === 0 ? 'w-2/3' : 'ml-auto w-1/2'}`}
                      key={index}
                    />
                  ))}
                </div>
              ) : null}

              {!messagesQuery.isLoading && currentSession && messages.length === 0 ? (
                <div className="flex h-full min-h-[420px] items-center justify-center">
                  <div className="max-w-2xl text-center">
                    <p className="text-lg leading-8 text-ink/68 dark:text-slate-300">
                      Hỏi khái niệm, xin ví dụ, yêu cầu tóm tắt bài học hoặc mở Settings để xem tài liệu gợi ý theo đúng chủ đề đang học.
                    </p>
                  </div>
                </div>
              ) : null}

              {!messagesQuery.isLoading ? (
                <div className="w-full space-y-4">
                  {messages.map((message) => (
                    <ChatMessageBubble key={message.clientMessageId} message={message} onRetry={handleRetry} />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 sticky bottom-0 z-10 w-full bg-gradient-to-t from-paper via-paper/98 to-transparent pb-1 pt-2 dark:from-slate-950 dark:via-slate-950/98 dark:to-transparent">
              <ChatComposer disabled={!currentSession || isStreaming} onSend={handleSend} />
            </div>
          </div>
        </main>
      </div>

      <WorkspaceSettingsSheet
        activeProvider={activeProvider}
        connectionState={connectionState}
        currentSession={currentSession}
        diagnostics={providerDiagnosticsQuery.data ?? null}
        diagnosticsError={providerDiagnosticsError?.message ?? null}
        diagnosticsMeta={providerDiagnosticsError?.meta ?? null}
        diagnosticsLoading={providerDiagnosticsQuery.isFetching}
        draftTitle={draftTitle}
        errorMessage={recommendationsError?.message ?? null}
        errorMeta={recommendationsError?.meta ?? null}
        hasExternalProviders={hasExternalProviders}
        isLoading={recommendationsQuery.isLoading}
        isOpen={settingsOpen}
        isSavingTitle={updateSessionMutation.isPending}
        materials={recommendationsQuery.data?.items ?? []}
        onClose={() => setSettingsOpen(false)}
        onDraftTitleChange={setDraftTitle}
        onLogout={async () => {
          setSettingsOpen(false);
          await handleLogout();
        }}
        onProviderChange={(provider) => {
          if (!currentSession) {
            return;
          }
          updateSessionMutation.mutate({
            sessionId: currentSession.id,
            input: { providerPreference: provider },
          });
        }}
        onRetry={() => recommendationsQuery.refetch()}
        onRunDiagnostics={() => providerDiagnosticsQuery.refetch()}
        onSaveTitle={handleSaveTitle}
        onSearchChange={setResourceSearch}
        onToggleTheme={toggleTheme}
        providerOptions={providerOptions}
        searchValue={resourceSearch}
        theme={theme}
      />
    </div>
  );
};
