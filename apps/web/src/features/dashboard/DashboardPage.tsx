import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import type { ChatMessage, ChatSessionSummary, ProviderKey } from '@chatbot-ai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Library, Menu, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ChatComposer } from '../../components/chat/ChatComposer';
import { ChatMessageBubble } from '../../components/chat/ChatMessageBubble';
import { ThreadWelcome } from '../../components/chat/ThreadWelcome';
import { ContextDrawer } from '../../components/layout/ContextDrawer';
import { SessionSidebar } from '../../components/layout/SessionSidebar';
import { WorkspaceSettingsSheet } from '../../components/layout/WorkspaceSettingsSheet';
import { IconButton } from '../../components/ui/IconButton';
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
import {
  fetchProviderIncidents,
  fetchProviderMetrics,
  fetchProviders,
  testProviders,
} from '../../services/providers-service';
import { fetchChatUsage } from '../../services/usage-service';
import { useAuthStore } from '../../store/auth-store';
import { useUiStore } from '../../store/ui-store';
import { getTransportErrorInfo, toPanelError } from '../../utils/transport-errors';
import { queryKeys } from '../../utils/query-keys';

const createClientMessageId = () => crypto.randomUUID();

const appendPrompt = (current: string, next: string) =>
  current.trim().length > 0 ? `${current.trim()}\n\n${next}` : next;

const sortMessagesForRender = (items: ChatMessage[]) =>
  [...items].sort((left, right) => {
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
  const [composerDraft, setComposerDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    queryKey: queryKeys.providerDiagnostics,
    queryFn: testProviders,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const providerMetricsQuery = useQuery({
    enabled: settingsOpen,
    queryKey: queryKeys.providerMetrics,
    queryFn: fetchProviderMetrics,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const providerIncidentsQuery = useQuery({
    enabled: settingsOpen,
    queryKey: queryKeys.providerIncidents,
    queryFn: () => fetchProviderIncidents(12),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const usageQuery = useQuery({
    enabled: settingsOpen && Boolean(selectedSessionId),
    queryKey: queryKeys.usage(selectedSessionId),
    queryFn: () => fetchChatUsage(selectedSessionId),
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
  const messages = useMemo(
    () => sortMessagesForRender(messagesQuery.data?.items ?? []),
    [messagesQuery.data?.items],
  );
  const providerOptions =
    providersQuery.data?.providers.map((provider) => provider.key) ?? ['GEMINI', 'OPENAI'];
  const hasExternalProviders =
    (providersQuery.data?.providers.filter((provider) => provider.enabled && provider.configured).length ?? 0) > 0;
  const activeProvider =
    currentSession?.providerPreference ?? providersQuery.data?.defaultProvider ?? 'GEMINI';
  const recommendationsError = recommendationsQuery.error
    ? toPanelError(recommendationsQuery.error, 'Could not load recommendations.')
    : null;
  const providerDiagnosticsError = providerDiagnosticsQuery.error
    ? toPanelError(providerDiagnosticsQuery.error, 'Could not check provider status.')
    : null;
  const messagesError = messagesQuery.error
    ? toPanelError(messagesQuery.error, 'Could not load messages.')
    : null;
  const isStreaming = messages.some((message) => message.status === 'streaming');
  const latestSourcedMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message) =>
            message.senderType === 'assistant' &&
            Boolean(message.retrievalSnapshot?.materials.length),
        ) ?? null,
    [messages],
  );

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
      setContextDrawerOpen(false);
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

  const ensureSessionId = async () => {
    if (selectedSessionId) {
      return selectedSessionId;
    }

    const session = await createSessionMutation.mutateAsync(activeProvider);
    return session.id;
  };

  const handleSend = async (message: string) => {
    try {
      const sessionId = await ensureSessionId();
      await sendMessage({
        sessionId,
        clientMessageId: createClientMessageId(),
        message,
        provider: activeProvider,
      });
      setComposerDraft('');
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Could not send message.');
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
      toast.error('Could not find original question to retry.');
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
      const info = getTransportErrorInfo(error, 'Retry failed.');
      toast.error(info.message, {
        description: info.description,
      });
    }
  };

  const handlePromptSelect = (value: string) => {
    setComposerDraft((current) => appendPrompt(current, value));
  };

  return (
    <div className="workspace-shell">
      <div className="workspace-grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="hidden min-h-0 lg:block">
          <div className="h-full rounded-2xl border border-black/[0.05] bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.88)]">
            <SessionSidebar
              activeSessionId={selectedSessionId}
              isCollapsed={sidebarCollapsed}
              onCreate={() => createSessionMutation.mutate(activeProvider)}
              onDelete={(sessionId) => deleteSessionMutation.mutate(sessionId)}
              onOpenSettings={() => setSettingsOpen(true)}
              onSelect={(sessionId) => {
                startTransition(() => setSelectedSessionId(sessionId));
              }}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              sessions={sessions}
            />
          </div>
        </div>

        <main className="relative min-h-0 overflow-hidden rounded-2xl border border-black/[0.05] bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.88)] lg:rounded-l-none">
          <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 lg:hidden">
            <IconButton
              icon={<Menu className="h-4 w-4" />}
              onClick={() => setSidebarOpen(true)}
              size="sm"
              tooltip="Menu"
            />
          </div>

          <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
            <IconButton
              badge={recommendationsQuery.data?.items.length}
              icon={<Library className="h-4 w-4" />}
              onClick={() => setContextDrawerOpen(true)}
              size="sm"
              tooltip="Learning context"
            />
            <IconButton
              icon={<Settings2 className="h-4 w-4" />}
              onClick={() => setSettingsOpen(true)}
              size="sm"
              tooltip="Settings"
            />
          </div>

          <div className="flex h-full min-h-0 flex-col pt-14 lg:pt-0">
            <div
              className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-4 sm:pb-4"
              data-testid="chat-messages"
              ref={messagesViewportRef}
            >
              {currentSession && (connectionState !== 'connected' || recoveryState !== 'idle') ? (
                <div
                  className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm"
                  data-testid="connection-banner"
                >
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {connectionState === 'reconnecting'
                      ? 'Reconnecting...'
                      : connectionState === 'disconnected'
                        ? 'Connection interrupted'
                        : recoveryState === 'syncing'
                          ? 'Syncing...'
                          : 'Check connection'}
                  </p>
                </div>
              ) : null}

              {!messagesQuery.isLoading && messagesError ? (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-4 text-sm">
                  <p className="font-medium text-red-600 dark:text-red-400">Could not load messages</p>
                  <p className="mt-1 text-ink/70 dark:text-slate-300">{messagesError.message}</p>
                </div>
              ) : null}

              {messagesQuery.isLoading ? (
                <div className="mx-auto w-full max-w-[720px] space-y-4 pt-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      className={`h-24 rounded-2xl bg-black/[0.03] animate-pulse dark:bg-white/[0.05] ${index % 2 === 0 ? 'w-full' : 'ml-auto w-[70%]'}`}
                      key={index}
                    />
                  ))}
                </div>
              ) : null}

              {!messagesQuery.isLoading && currentSession && messages.length === 0 ? (
                <ThreadWelcome
                  hasExternalProviders={hasExternalProviders}
                  hasSession
                  onCreateSession={() => createSessionMutation.mutate(activeProvider)}
                  onPromptSelect={handlePromptSelect}
                />
              ) : null}

              {!messagesQuery.isLoading && !currentSession && messages.length === 0 ? (
                <ThreadWelcome
                  hasExternalProviders={hasExternalProviders}
                  hasSession={false}
                  onCreateSession={() => createSessionMutation.mutate(activeProvider)}
                  onPromptSelect={handlePromptSelect}
                />
              ) : null}

              {!messagesQuery.isLoading && messages.length > 0 ? (
                <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col justify-end pt-4">
                  <div className="space-y-4 pb-2">
                    {messages.map((message) => (
                      <ChatMessageBubble
                        key={message.clientMessageId}
                        message={message}
                        onPrefill={handlePromptSelect}
                        onRetry={handleRetry}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-black/[0.05] bg-white/50 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/30">
              <ChatComposer
                activeProvider={activeProvider}
                connectionState={connectionState}
                disabled={createSessionMutation.isPending || isStreaming}
                onChange={setComposerDraft}
                onOpenContext={() => setContextDrawerOpen(true)}
                onSend={handleSend}
                value={composerDraft}
              />
            </div>
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
          <div className="relative h-full w-[300px] max-w-[90vw] p-3">
            <div className="h-full rounded-2xl border border-black/[0.05] bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.96)]">
              <SessionSidebar
                activeSessionId={selectedSessionId}
                onCreate={() => createSessionMutation.mutate(activeProvider)}
                onDelete={(sessionId) => deleteSessionMutation.mutate(sessionId)}
                onOpenSettings={() => {
                  setSidebarOpen(false);
                  setSettingsOpen(true);
                }}
                onSelect={(sessionId) => {
                  startTransition(() => setSelectedSessionId(sessionId));
                  setSidebarOpen(false);
                }}
                sessions={sessions}
              />
            </div>
          </div>
        </div>
      )}

      <ContextDrawer
        activeProvider={activeProvider}
        currentSession={currentSession}
        hasExternalProviders={hasExternalProviders}
        isOpen={contextDrawerOpen}
        latestSourcedMessage={latestSourcedMessage}
        materials={recommendationsQuery.data?.items ?? []}
        materialsError={recommendationsError?.message ?? null}
        materialsErrorMeta={recommendationsError?.meta ?? null}
        materialsLoading={recommendationsQuery.isLoading}
        onClose={() => setContextDrawerOpen(false)}
        onPromptSelect={(value) => {
          handlePromptSelect(value);
        }}
        onRetryMaterials={() => recommendationsQuery.refetch()}
        onSearchChange={setResourceSearch}
        searchValue={resourceSearch}
      />

      <WorkspaceSettingsSheet
        activeProvider={activeProvider}
        connectionState={connectionState}
        currentSession={currentSession}
        diagnostics={providerDiagnosticsQuery.data ?? null}
        diagnosticsError={providerDiagnosticsError?.message ?? null}
        diagnosticsLoading={providerDiagnosticsQuery.isFetching}
        draftTitle={draftTitle}
        hasExternalProviders={hasExternalProviders}
        isOpen={settingsOpen}
        isSavingTitle={updateSessionMutation.isPending}
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
        onRunDiagnostics={() => providerDiagnosticsQuery.refetch()}
        onSaveTitle={handleSaveTitle}
        onToggleTheme={toggleTheme}
        providerIncidents={providerIncidentsQuery.data ?? null}
        providerMetrics={providerMetricsQuery.data ?? null}
        providerOptions={providerOptions}
        theme={theme}
        usage={usageQuery.data ?? null}
      />
    </div>
  );
};
