import { Suspense, lazy, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import type { AiRuntimeMode, ArtifactContent, ArtifactGenerateType, ArtifactType, ChatMessage, ChatSessionSummary, ProviderKey, ReviewSelfAssessment, StudyArtifact } from '@chatbot-ai/shared';
import { DEFAULT_AI_RUNTIME_MODE, AI_RUNTIME_MODE_LABELS } from '@chatbot-ai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Library, Menu, Settings2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ChatComposer } from '../../components/chat/ChatComposer';
import { ChatMessageBubble } from '../../components/chat/ChatMessageBubble';
import { ThreadWelcome } from '../../components/chat/ThreadWelcome';
import { WorkspaceActivationGuide } from '../../components/chat/WorkspaceActivationGuide';
import { ContextDrawer } from '../../components/layout/ContextDrawer';
import { SessionSidebar } from '../../components/layout/SessionSidebar';
import { WorkspaceSettingsSheet } from '../../components/layout/WorkspaceSettingsSheet';
import { IconButton } from '../../components/ui/IconButton';
import type { ArtifactBrowseMode } from '../../components/layout/ArtifactDrawer';
import { useFavorites } from '../../hooks/use-artifact-search';
import { useChatSocket } from '../../hooks/use-chat-socket';
import { useContinueLearning } from '../../hooks/use-continue-learning';
import { useSessionSources } from '../../hooks/use-session-sources';
import { useWorkspaceActivation } from '../../hooks/use-workspace-activation';
import {
  batchArchiveSessions,
  batchDeleteSessions,
  createSession,
  deleteSession,
  fetchArchivedSessions,
  fetchMessages,
  fetchSessions,
  type SessionListResult,
  updateSession,
} from '../../services/chat-service';
import {
  buildArtifactShareUrl,
  createArtifactShareLink,
  deleteArtifact,
  exportArtifactMarkdown,
  fetchArtifacts,
  fetchSessionArtifacts,
  generateArtifact,
  recordArtifactReviewEvent,
  refineArtifact,
  revokeArtifactShareLink,
  toggleFavorite,
  updateArtifactContent,
} from '../../services/artifacts-service';
import { logout } from '../../services/auth-service';
import { fetchLearningInsights } from '../../services/insights-service';
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

const ArtifactDrawer = lazy(() =>
  import('../../components/layout/ArtifactDrawer').then((module) => ({ default: module.ArtifactDrawer })),
);
const LearningInsightsDrawer = lazy(() =>
  import('../../components/layout/LearningInsightsDrawer').then((module) => ({
    default: module.LearningInsightsDrawer,
  })),
);
const QuizReviewMode = lazy(() =>
  import('../../components/chat/artifact-preview/QuizReviewMode').then((module) => ({ default: module.QuizReviewMode })),
);

const appendPrompt = (current: string, next: string) =>
  current.trim().length > 0 ? `${current.trim()}\n\n${next}` : next;

const countArtifactSessions = (artifacts: StudyArtifact[]) =>
  new Set(artifacts.map((artifact) => artifact.sessionId).filter(Boolean)).size;

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

const PAGE_SIZE = 20;
type BatchDeleteScope = 'active' | 'archived';
const ACTIVATION_PROMPT_STARTERS = [
  'Giải thích khái niệm này theo cách dễ hiểu',
  'Cho mình một ví dụ thực tế',
  'Tóm tắt chủ đề này thành 5 ý chính',
  'Tạo 5 flashcard để mình ôn nhanh',
  'Tạo 3 câu hỏi quiz để mình tự kiểm tra',
];

const ArtifactDrawerFallback = ({ onClose }: { onClose: () => void }) => (
  <>
    <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] sm:hidden" onClick={onClose} />
    <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-[440px] max-w-[94vw] flex-col overflow-hidden rounded-l-[26px] border-l border-black/[0.08] bg-[rgba(250,252,255,0.98)] shadow-[0_26px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.97)]">
      <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 dark:border-white/10">
        <div>
          <p className="text-sm font-semibold text-ink dark:text-slate-100">Study Artifacts</p>
          <p className="text-xs leading-5 text-ink/62 dark:text-slate-400">Loading artifact workspace...</p>
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="surface-card h-24 animate-pulse" key={index} />
        ))}
      </div>
    </aside>
  </>
);

const LearningInsightsDrawerFallback = ({ onClose }: { onClose: () => void }) => (
  <>
    <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] sm:hidden" onClick={onClose} />
    <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-[432px] max-w-[94vw] flex-col overflow-hidden rounded-l-[26px] border-l border-black/[0.08] bg-[rgba(250,252,255,0.98)] shadow-[0_26px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.97)]">
      <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 dark:border-white/10">
        <div>
          <p className="text-sm font-semibold text-ink dark:text-slate-100">Learning Insights</p>
          <p className="text-xs leading-5 text-ink/62 dark:text-slate-400">Loading study insights...</p>
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="surface-card h-24 animate-pulse" key={index} />
        ))}
      </div>
    </aside>
  </>
);

const QuizReviewFallback = () => (
  <div className="flex items-center justify-center py-12 text-sm font-medium text-ink/70 dark:text-slate-300">
    Loading quiz review...
  </div>
);

export const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const selectedSessionId = useUiStore((state) => state.selectedSessionId);
  const setSelectedSessionId = useUiStore((state) => state.setSelectedSessionId);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const sidebarArchivedOpen = useUiStore((state) => state.sidebarArchivedOpen);
  const setSidebarArchivedOpen = useUiStore((state) => state.setSidebarArchivedOpen);

  const [resourceSearch, setResourceSearch] = useState('');
  const deferredSearch = useDeferredValue(resourceSearch);
  const [draftTitle, setDraftTitle] = useState('');
  const [composerDraft, setComposerDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [artifactsDrawerOpen, setArtifactsDrawerOpen] = useState(false);
  const [artifactBrowseMode, setArtifactBrowseMode] = useState<ArtifactBrowseMode>('session');
  const [artifactFilter, setArtifactFilter] = useState<ArtifactType | 'all'>('all');
  const [generatingArtifactType, setGeneratingArtifactType] = useState<ArtifactGenerateType | null>(null);
  const [quizReviewArtifact, setQuizReviewArtifact] = useState<StudyArtifact | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => fetchSessions(undefined, PAGE_SIZE),
  });
  const archivedSessionsQuery = useQuery({
    queryKey: queryKeys.archivedSessions,
    queryFn: () => fetchArchivedSessions(undefined, PAGE_SIZE),
  });
  const [sessionsList, setSessionsList] = useState<ChatSessionSummary[]>([]);
  const [sessionsCursor, setSessionsCursor] = useState<string | null>(null);
  const [hasMoreSessions, setHasMoreSessions] = useState(false);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);

  useEffect(() => {
    if (sessionsQuery.data) {
      setSessionsList((prev) => {
        if (prev.length === 0) return sessionsQuery.data!.items;
        const seen = new Set(prev.map((s) => s.id));
        const newItems = sessionsQuery.data!.items.filter((s) => !seen.has(s.id));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
      setSessionsCursor(sessionsQuery.data.nextCursor);
      setHasMoreSessions(sessionsQuery.data.hasMore);
    }
  }, [sessionsQuery.data]);

  const loadMoreSessions = useCallback(async () => {
    if (!sessionsCursor || loadingMoreSessions) return;
    setLoadingMoreSessions(true);
    try {
      const result = await fetchSessions(sessionsCursor, PAGE_SIZE);
      setSessionsList((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...result.items.filter((s) => !seen.has(s.id))];
      });
      setSessionsCursor(result.nextCursor);
      setHasMoreSessions(result.hasMore);
    } finally {
      setLoadingMoreSessions(false);
    }
  }, [sessionsCursor, loadingMoreSessions]);
  const continueLearningQuery = useContinueLearning();
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
    enabled: settingsOpen || insightsOpen,
    queryKey: queryKeys.providerMetrics,
    queryFn: fetchProviderMetrics,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const providerIncidentsQuery = useQuery({
    enabled: settingsOpen || insightsOpen,
    queryKey: queryKeys.providerIncidents,
    queryFn: () => fetchProviderIncidents(12),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const learningInsightsQuery = useQuery({
    enabled: insightsOpen,
    queryKey: queryKeys.learningInsights,
    queryFn: fetchLearningInsights,
    staleTime: 30_000,
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
  const artifactsQuery = useQuery({
    enabled: Boolean(selectedSessionId),
    queryKey: selectedSessionId ? queryKeys.artifacts(selectedSessionId) : ['artifacts-disabled'],
    queryFn: () => fetchSessionArtifacts(selectedSessionId!),
  });
  const favoriteArtifactsQuery = useFavorites(artifactsDrawerOpen && artifactBrowseMode === 'favorites');
  const allArtifactsQuery = useQuery({
    enabled: artifactsDrawerOpen && artifactBrowseMode === 'all',
    queryKey: queryKeys.artifactsAll(),
    queryFn: () => fetchArtifacts({ limit: 50 }),
    staleTime: 30_000,
  });

  const sessions = sessionsList.length > 0 || sessionsQuery.isSuccess ? sessionsList : sessionsQuery.data?.items ?? [];
  const sessionsTotal = sessionsQuery.data?.totalCount;
  const archivedSessions = archivedSessionsQuery.data?.items ?? [];
  const continueLearningSessions = continueLearningQuery.data?.items ?? [];
  const allKnownSessions = useMemo(
    () => [...sessions, ...archivedSessions],
    [archivedSessions, sessions],
  );
  const currentSession = sessions.find((session) => session.id === selectedSessionId) ?? null;
  const messages = useMemo(
    () => sortMessagesForRender(messagesQuery.data?.items ?? []),
    [messagesQuery.data?.items],
  );
  const totalKnownMessages = useMemo(
    () => Math.max(allKnownSessions.reduce((sum, session) => sum + session.messageCount, 0), messages.length),
    [allKnownSessions, messages.length],
  );
  const hasCreatedSession = (sessionsTotal ?? allKnownSessions.length) > 0 || Boolean(currentSession);
  const hasCreatedArtifact = useMemo(
    () =>
      (artifactsQuery.data?.items.length ?? 0) > 0 ||
      allKnownSessions.some((session) => session.artifactCount > 0),
    [allKnownSessions, artifactsQuery.data?.items.length],
  );
  const hasAskedFirstQuestion = totalKnownMessages > 0;
  const isEarlyWorkspace = (sessionsTotal ?? allKnownSessions.length) <= 2 && totalKnownMessages <= 12;
  const providerOptions =
    providersQuery.data?.providers.map((provider) => provider.key) ?? ['GEMINI', 'OPENAI'];
  const hasExternalProviders =
    (providersQuery.data?.providers.filter((provider) => provider.enabled && provider.configured).length ?? 0) > 0;
  const activeProvider =
    currentSession?.providerPreference ?? providersQuery.data?.defaultProvider ?? 'GEMINI';
  const recommendationsError = recommendationsQuery.error
    ? toPanelError(recommendationsQuery.error, 'Could not load recommendations.')
    : null;
  const artifactsError = (
    artifactBrowseMode === 'session'
      ? artifactsQuery.error
      : artifactBrowseMode === 'favorites'
        ? favoriteArtifactsQuery.error
        : allArtifactsQuery.error
  )
    ? toPanelError(
        artifactBrowseMode === 'session'
          ? artifactsQuery.error
          : artifactBrowseMode === 'favorites'
            ? favoriteArtifactsQuery.error
            : allArtifactsQuery.error,
        'Could not load study artifacts.',
      )
    : null;
  const providerDiagnosticsError = providerDiagnosticsQuery.error
    ? toPanelError(providerDiagnosticsQuery.error, 'Could not check provider status.')
    : null;
  const learningInsightsError = learningInsightsQuery.error
    ? toPanelError(learningInsightsQuery.error, 'Could not load learning insights.')
    : null;
  const providerInsightsError =
    providersQuery.error || providerMetricsQuery.error || providerIncidentsQuery.error
      ? toPanelError(
          providersQuery.error ?? providerMetricsQuery.error ?? providerIncidentsQuery.error,
          'Could not load provider summary.',
        )
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
  const latestThreadIntelligence = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message) =>
            message.senderType === 'assistant' &&
            Boolean(message.subjectLabel || message.topicLabel || message.levelLabel),
        ) ?? null,
    [messages],
  );
  const { dismiss: dismissActivation, dismissed: activationDismissed } = useWorkspaceActivation(user?.id ?? null);
  const showActivationGuide = !activationDismissed && isEarlyWorkspace && !hasCreatedArtifact;

  const sessionSourcesResult = useSessionSources(messages);
  const { materials: sessionSources } = sessionSourcesResult;
  const artifactWorkspace = useMemo(() => {
    const currentSessionArtifacts = artifactsQuery.data?.items ?? [];
    const favoriteArtifacts = favoriteArtifactsQuery.data?.items ?? [];
    const allArtifacts = allArtifactsQuery.data?.items ?? [];

    switch (artifactBrowseMode) {
      case 'favorites':
        return {
          artifacts: favoriteArtifacts,
          isLoading: favoriteArtifactsQuery.isLoading,
          sessionCount: countArtifactSessions(favoriteArtifacts),
        };
      case 'all':
        return {
          artifacts: allArtifacts,
          isLoading: allArtifactsQuery.isLoading,
          sessionCount: countArtifactSessions(allArtifacts),
        };
      case 'session':
      default:
        return {
          artifacts: currentSessionArtifacts,
          isLoading: artifactsQuery.isLoading,
          sessionCount: countArtifactSessions(currentSessionArtifacts),
        };
    }
  }, [
    allArtifactsQuery.data?.items,
    allArtifactsQuery.isLoading,
    artifactBrowseMode,
    artifactsQuery.data?.items,
    artifactsQuery.isLoading,
    favoriteArtifactsQuery.data?.items,
    favoriteArtifactsQuery.isLoading,
  ]);

  const { connectionState, recoveryError, recoveryState, retryMessage, sendMessage } = useChatSocket(
    selectedSessionId,
  );

  const invalidateArtifactQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['artifacts'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.artifactFavorites() });
    void queryClient.invalidateQueries({ queryKey: ['artifact-search'] });
  }, [queryClient]);

  const invalidateSessionDerivedQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.continueLearning });
    void queryClient.invalidateQueries({ queryKey: ['global-search'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.learningInsights });
  }, [queryClient]);

  const removeSessionIdsFromActiveState = useCallback(
    (sessionIds: string[], totalDelta = sessionIds.length) => {
      const sessionIdSet = new Set(sessionIds);
      setSessionsList((previous) => previous.filter((item) => !sessionIdSet.has(item.id)));
      queryClient.setQueryData(queryKeys.sessions, (previous: SessionListResult | undefined) =>
        previous
          ? {
              ...previous,
              items: previous.items.filter((item) => !sessionIdSet.has(item.id)),
              totalCount: Math.max(0, previous.totalCount - totalDelta),
            }
          : previous,
      );
    },
    [queryClient],
  );

  const removeSessionIdsFromArchivedState = useCallback(
    (sessionIds: string[], totalDelta = sessionIds.length) => {
      const sessionIdSet = new Set(sessionIds);
      queryClient.setQueryData(queryKeys.archivedSessions, (previous: SessionListResult | undefined) =>
        previous
          ? {
              ...previous,
              items: previous.items.filter((item) => !sessionIdSet.has(item.id)),
              totalCount: Math.max(0, previous.totalCount - totalDelta),
            }
          : previous,
      );
    },
    [queryClient],
  );

  const resolveNextActiveSessionId = useCallback(
    (removedSessionIds: string[]) => {
      const removedSet = new Set(removedSessionIds);
      return sessions.find((item) => !removedSet.has(item.id))?.id ?? null;
    },
    [sessions],
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
        isPinned?: boolean;
        isArchived?: boolean;
      };
    }) => updateSession(sessionId, input),
    onSuccess: (session) => {
      setSessionsList((prev) =>
        prev.map((item) => (item.id === session.id ? { ...item, ...session } : item)),
      );
      queryClient.setQueryData(
        queryKeys.sessions,
        (previous: SessionListResult | undefined) => {
          if (!previous) return previous;
          return {
            ...previous,
            items: previous.items.map((item) => (item.id === session.id ? { ...item, ...session } : item)),
          };
        },
      );
      queryClient.setQueryData(
        queryKeys.archivedSessions,
        (previous: { items: ChatSessionSummary[]; total: number } | undefined) => ({
          items: (previous?.items ?? []).map((item) => (item.id === session.id ? { ...item, ...session } : item)),
          total: previous?.total ?? 0,
        }),
      );
    },
  });

  const runtimeModeMutation = useMutation({
    mutationFn: ({ sessionId, aiRuntimeMode }: { sessionId: string; aiRuntimeMode: AiRuntimeMode }) =>
      updateSession(sessionId, { aiRuntimeMode }),
    onSuccess: (session) => {
      setSessionsList((prev) =>
        prev.map((item) => (item.id === session.id ? { ...item, ...session } : item)),
      );
      queryClient.setQueryData(
        queryKeys.sessions,
        (previous: SessionListResult | undefined) => {
          if (!previous) return previous;
          return {
            ...previous,
            items: previous.items.map((item) => (item.id === session.id ? { ...item, ...session } : item)),
          };
        },
      );
      toast.success(`Chế độ AI: ${AI_RUNTIME_MODE_LABELS[session.aiRuntimeMode].vi}`);
    },
    onError: () => {
      toast.error('Không thể đổi chế độ AI. Vui lòng thử lại.');
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
      queryClient.setQueryData(
        queryKeys.archivedSessions,
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

  const pinSessionMutation = useMutation({
    mutationFn: ({ sessionId, isPinned }: { sessionId: string; isPinned: boolean }) =>
      updateSession(sessionId, { isPinned }),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(
        queryKeys.sessions,
        (previous: { items: ChatSessionSummary[]; total: number } | undefined) => ({
          items: (previous?.items ?? []).map((item) =>
            item.id === updatedSession.id ? { ...item, ...updatedSession } : item,
          ),
          total: previous?.total ?? 0,
        }),
      );
    },
  });

  const archiveSessionMutation = useMutation({
    mutationFn: (sessionId: string) => updateSession(sessionId, { isArchived: true }),
    onSuccess: (archivedSession) => {
      queryClient.setQueryData(
        queryKeys.sessions,
        (previous: { items: ChatSessionSummary[]; total: number } | undefined) => {
          const items = (previous?.items ?? []).filter((item) => item.id !== archivedSession.id);
          return { items, total: items.length };
        },
      );
      queryClient.setQueryData(
        queryKeys.archivedSessions,
        (previous: { items: ChatSessionSummary[]; total: number } | undefined) => ({
          items: [{ ...archivedSession, isArchived: true }, ...(previous?.items ?? [])],
          total: (previous?.items.length ?? 0) + 1,
        }),
      );
      if (selectedSessionId === archivedSession.id) {
        startTransition(() => {
          setSelectedSessionId(sessions.find((item) => item.id !== archivedSession.id)?.id ?? null);
        });
      }
    },
  });

  const unarchiveSessionMutation = useMutation({
    mutationFn: (sessionId: string) => updateSession(sessionId, { isArchived: false }),
    onSuccess: (restoredSession) => {
      queryClient.setQueryData(
        queryKeys.archivedSessions,
        (previous: { items: ChatSessionSummary[]; total: number } | undefined) => {
          const items = (previous?.items ?? []).filter((item) => item.id !== restoredSession.id);
          return { items, total: items.length };
        },
      );
      queryClient.setQueryData(
        queryKeys.sessions,
        (previous: { items: ChatSessionSummary[]; total: number } | undefined) => ({
          items: [restoredSession, ...(previous?.items ?? [])],
          total: (previous?.items.length ?? 0) + 1,
        }),
      );
    },
  });

  const batchArchiveSessionMutation = useMutation({
    mutationFn: (sessionIds: string[]) => batchArchiveSessions(sessionIds),
    onSuccess: (response, sessionIds) => {
      removeSessionIdsFromActiveState(sessionIds, response.count);
      void queryClient.invalidateQueries({ queryKey: queryKeys.archivedSessions });
      invalidateSessionDerivedQueries();

      if (selectedSessionId && sessionIds.includes(selectedSessionId)) {
        startTransition(() => {
          setSelectedSessionId(resolveNextActiveSessionId(sessionIds));
        });
      }

      toast.success(`Archived ${response.count} session${response.count === 1 ? '' : 's'}`);
    },
  });

  const batchDeleteSessionMutation = useMutation({
    mutationFn: ({ sessionIds }: { sessionIds: string[]; scope: BatchDeleteScope }) => batchDeleteSessions(sessionIds),
    onSuccess: (response, { sessionIds, scope }) => {
      if (scope === 'active') {
        removeSessionIdsFromActiveState(sessionIds, response.count);
      } else {
        removeSessionIdsFromArchivedState(sessionIds, response.count);
      }

      invalidateSessionDerivedQueries();

      if (scope === 'active' && selectedSessionId && sessionIds.includes(selectedSessionId)) {
        startTransition(() => {
          setSelectedSessionId(resolveNextActiveSessionId(sessionIds));
        });
      }

      toast.success(`Deleted ${response.count} session${response.count === 1 ? '' : 's'}`);
    },
  });

  const generateArtifactMutation = useMutation({
    mutationFn: ({
      type,
      sourceContent,
      messageId,
    }: {
      type: ArtifactGenerateType;
      sourceContent: string;
      messageId?: string;
    }) =>
      generateArtifact({
        sessionId: selectedSessionId ?? undefined,
        type,
        sourceContent,
        messageId,
      }),
    onSuccess: (artifact) => {
      if (selectedSessionId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.artifacts(selectedSessionId) });
      }
      setGeneratingArtifactType(null);
      toast.success(`Đã tạo ${artifact.type.replace('_', ' ')} thành công`);
    },
    onError: () => {
      setGeneratingArtifactType(null);
    },
  });

  const deleteArtifactMutation = useMutation({
    mutationFn: deleteArtifact,
    onSuccess: () => {
      invalidateArtifactQueries();
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => {
      invalidateArtifactQueries();
    },
  });

  const exportArtifactMutation = useMutation({
    mutationFn: exportArtifactMarkdown,
    onSuccess: (payload) => {
      const blob = new Blob([payload.markdown], { type: payload.mimeType });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = payload.filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      toast.success('Markdown export ready');
    },
  });

  const shareArtifactMutation = useMutation({
    mutationFn: createArtifactShareLink,
    onSuccess: async (payload) => {
      const shareUrl = buildArtifactShareUrl(payload.shareToken);

      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Share link copied', {
          description: 'You can now open or send this public read-only artifact link.',
        });
      } catch {
        window.prompt('Copy share link', shareUrl);
        toast.success('Share link created');
      }

      invalidateArtifactQueries();
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: revokeArtifactShareLink,
    onSuccess: () => {
      invalidateArtifactQueries();
      toast.success('Share link revoked');
    },
  });

  const saveArtifactContentMutation = useMutation({
    mutationFn: ({
      artifactId,
      content,
    }: {
      artifactId: string;
      content: ArtifactContent;
    }) =>
      updateArtifactContent(artifactId, {
        content,
      }),
    onSuccess: () => {
      invalidateArtifactQueries();
      toast.success('Artifact updated');
    },
  });

  const refineArtifactMutation = useMutation({
    mutationFn: ({
      artifactId,
      instruction,
      customInstruction,
    }: {
      artifactId: string;
      instruction: 'make_easier' | 'make_harder' | 'add_examples' | 'shorten' | 'expand' | 'fix_accuracy' | 'custom';
      customInstruction?: string;
    }) =>
      refineArtifact(artifactId, {
        instruction,
        customInstruction,
      }),
    onSuccess: () => {
      invalidateArtifactQueries();
      toast.success('Artifact refined');
    },
  });
  const recordArtifactReviewEventMutation = useMutation({
    mutationFn: ({
      artifactId,
      itemIndex,
      selfAssessment,
    }: {
      artifactId: string;
      itemIndex: number;
      selfAssessment: ReviewSelfAssessment;
    }) =>
      recordArtifactReviewEvent(artifactId, {
        itemIndex,
        selfAssessment,
      }),
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

  const handleGenerateArtifact = async (
    type: ArtifactGenerateType,
    sourceContent: string,
    messageId?: string,
  ) => {
    setGeneratingArtifactType(type);
    await generateArtifactMutation.mutateAsync({ type, sourceContent, messageId });
  };

  const handleOpenArtifactsDrawer = () => {
    setArtifactBrowseMode('session');
    setArtifactFilter('all');
    setArtifactsDrawerOpen(true);
  };

  const handleOpenInsightsDrawer = () => {
    setInsightsOpen(true);
  };
  const handleOpenAiLab = () => {
    void navigate('/app/ai-lab');
  };

  const handleRecordArtifactReviewEvent = async (
    artifact: StudyArtifact,
    itemIndex: number,
    selfAssessment: ReviewSelfAssessment,
  ) => {
    try {
      await recordArtifactReviewEventMutation.mutateAsync({
        artifactId: artifact.id,
        itemIndex,
        selfAssessment,
      });
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Could not save review feedback.');
      toast.error(info.message, { description: info.description });
      throw error;
    }
  };
  const activationGuide = showActivationGuide ? (
    <WorkspaceActivationGuide
      hasCreatedArtifact={hasCreatedArtifact}
      hasCreatedSession={hasCreatedSession}
      hasAskedFirstQuestion={hasAskedFirstQuestion}
      hasSession={Boolean(currentSession)}
      onDismiss={dismissActivation}
      onOpenArtifacts={handleOpenArtifactsDrawer}
      onOpenInsights={handleOpenInsightsDrawer}
      variant="full"
    />
  ) : null;
  const showCompactActivation = showActivationGuide && messages.length > 0;

  const handleArtifactModeChange = (mode: ArtifactBrowseMode) => {
    setArtifactBrowseMode(mode);
    setArtifactFilter('all');
  };

  const handleSelectInsightSession = (sessionId: string) => {
    startTransition(() => {
      setSelectedSessionId(sessionId);
    });
    setInsightsOpen(false);
    setSidebarOpen(false);
  };

  const handleExportArtifact = async (artifact: StudyArtifact) => {
    try {
      await exportArtifactMutation.mutateAsync(artifact.id);
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Could not export artifact.');
      toast.error(info.message, { description: info.description });
    }
  };

  const handleShareArtifact = async (artifact: StudyArtifact) => {
    try {
      await shareArtifactMutation.mutateAsync(artifact.id);
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Could not create share link.');
      toast.error(info.message, { description: info.description });
    }
  };

  const handleRevokeArtifactShare = async (artifact: StudyArtifact) => {
    try {
      const shouldRevoke = window.confirm('Disable the current public share link for this artifact?');
      if (!shouldRevoke) {
        return;
      }

      await revokeShareMutation.mutateAsync(artifact.id);
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Could not revoke share link.');
      toast.error(info.message, { description: info.description });
    }
  };

  const handleBatchArchiveSessions = async (sessionIds: string[]) => {
    try {
      await batchArchiveSessionMutation.mutateAsync(sessionIds);
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Could not archive the selected sessions.');
      toast.error(info.message, { description: info.description });
      throw error;
    }
  };

  const handleBatchDeleteSessions = async (sessionIds: string[], scope: BatchDeleteScope) => {
    try {
      await batchDeleteSessionMutation.mutateAsync({ sessionIds, scope });
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Could not delete the selected sessions.');
      toast.error(info.message, { description: info.description });
      throw error;
    }
  };

  return (
    <div className="workspace-shell">
      <div className="workspace-grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="hidden min-h-0 lg:block">
          <div className="h-full rounded-2xl border border-black/[0.05] bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.88)]">
            <SessionSidebar
              activeSessionId={selectedSessionId}
              archivedSessions={archivedSessions}
              continueLearningSessions={continueLearningSessions}
              hasMore={hasMoreSessions}
              isCollapsed={sidebarCollapsed}
              isLoadingMore={loadingMoreSessions}
              isBatchArchiving={batchArchiveSessionMutation.isPending}
              isBatchDeleting={batchDeleteSessionMutation.isPending}
              onArchive={(sessionId) => archiveSessionMutation.mutate(sessionId)}
              onBatchArchive={handleBatchArchiveSessions}
              onBatchDelete={handleBatchDeleteSessions}
              onCreate={() => createSessionMutation.mutate(activeProvider)}
              onDelete={(sessionId) => deleteSessionMutation.mutate(sessionId)}
              onLoadMore={loadMoreSessions}
              onOpenSettings={() => setSettingsOpen(true)}
              onPin={(sessionId, isPinned) => pinSessionMutation.mutate({ sessionId, isPinned })}
              onRename={(sessionId, title) =>
                updateSessionMutation.mutate({ sessionId, input: { title } })
              }
              onSelect={(sessionId) => {
                startTransition(() => setSelectedSessionId(sessionId));
              }}
              onToggleArchived={() => setSidebarArchivedOpen(!sidebarArchivedOpen)}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              onToggleArtifactFavorite={(id) => toggleFavoriteMutation.mutate(id)}
              onUnarchive={(sessionId) => unarchiveSessionMutation.mutate(sessionId)}
              sessions={sessions}
              showArchived={sidebarArchivedOpen}
              totalCount={sessionsTotal}
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
              badge={sessionSourcesResult.totalUnique}
              icon={<Library className="h-4 w-4" />}
              onClick={() => setContextDrawerOpen(true)}
              size="sm"
              tooltip="Learning context"
            />
            <IconButton
              badge={artifactsQuery.data?.items.length}
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              }
              onClick={handleOpenArtifactsDrawer}
              size="sm"
              tooltip="Study artifacts"
            />
            <IconButton
              icon={<BarChart3 className="h-4 w-4" />}
              onClick={handleOpenInsightsDrawer}
              size="sm"
              tooltip="Learning insights"
            />
            <IconButton
              icon={<Sparkles className="h-4 w-4" />}
              onClick={handleOpenAiLab}
              size="sm"
              tooltip="AI lab"
            />
            <IconButton
              data-testid="open-settings"
              icon={<Settings2 className="h-4 w-4" />}
              onClick={() => setSettingsOpen(true)}
              size="sm"
              tooltip="Settings"
            />
            {currentSession && (
              <span
                className="hidden items-center gap-1 rounded-full border border-ocean/20 bg-ocean/[0.06] px-2.5 py-1 text-[10px] font-semibold text-ocean sm:inline-flex dark:border-cyan/20 dark:bg-cyan/[0.06] dark:text-cyan"
                data-testid="runtime-mode-badge"
              >
                Mode: {AI_RUNTIME_MODE_LABELS[currentSession.aiRuntimeMode ?? DEFAULT_AI_RUNTIME_MODE].vi}
              </span>
            )}
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
                  activationContent={activationGuide}
                  hasExternalProviders={hasExternalProviders}
                  hasSession
                  onCreateSession={() => createSessionMutation.mutate(activeProvider)}
                  onPromptSelect={handlePromptSelect}
                  levelLabel={latestThreadIntelligence?.levelLabel ?? null}
                  promptItems={ACTIVATION_PROMPT_STARTERS}
                  showStarterPromptsExpanded={showActivationGuide}
                  subjectLabel={latestThreadIntelligence?.subjectLabel ?? null}
                  topicLabel={latestThreadIntelligence?.topicLabel ?? null}
                />
              ) : null}

              {!messagesQuery.isLoading && !currentSession && messages.length === 0 ? (
                <ThreadWelcome
                  activationContent={activationGuide}
                  hasExternalProviders={hasExternalProviders}
                  hasSession={false}
                  onCreateSession={() => createSessionMutation.mutate(activeProvider)}
                  onPromptSelect={handlePromptSelect}
                  levelLabel={latestThreadIntelligence?.levelLabel ?? null}
                  promptItems={ACTIVATION_PROMPT_STARTERS}
                  showStarterPromptsExpanded={showActivationGuide}
                  subjectLabel={latestThreadIntelligence?.subjectLabel ?? null}
                  topicLabel={latestThreadIntelligence?.topicLabel ?? null}
                />
              ) : null}

              {!messagesQuery.isLoading && messages.length > 0 ? (
                <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col justify-end pt-4">
                  {latestThreadIntelligence ? (
                    <ThreadWelcome
                      compact
                      hasExternalProviders={hasExternalProviders}
                      hasSession
                      levelLabel={latestThreadIntelligence.levelLabel}
                      onCreateSession={() => createSessionMutation.mutate(activeProvider)}
                      onPromptSelect={handlePromptSelect}
                      subjectLabel={latestThreadIntelligence.subjectLabel}
                      topicLabel={latestThreadIntelligence.topicLabel}
                    />
                  ) : null}
                  {showCompactActivation ? (
                    <WorkspaceActivationGuide
                      hasCreatedArtifact={hasCreatedArtifact}
                      hasCreatedSession={hasCreatedSession}
                      hasAskedFirstQuestion={hasAskedFirstQuestion}
                      hasSession={Boolean(currentSession)}
                      onDismiss={dismissActivation}
                      onOpenArtifacts={handleOpenArtifactsDrawer}
                      onOpenInsights={handleOpenInsightsDrawer}
                      variant="compact"
                    />
                  ) : null}
                  <div className="space-y-4 pb-2">
                    {messages.map((message) => (
                      <ChatMessageBubble
                        key={message.clientMessageId}
                        message={message}
                        generatingType={generatingArtifactType}
                        onGenerateArtifact={handleGenerateArtifact}
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
                archivedSessions={archivedSessions}
                continueLearningSessions={continueLearningSessions}
                hasMore={hasMoreSessions}
                isLoadingMore={loadingMoreSessions}
                isBatchArchiving={batchArchiveSessionMutation.isPending}
                isBatchDeleting={batchDeleteSessionMutation.isPending}
                onArchive={(sessionId) => archiveSessionMutation.mutate(sessionId)}
                onBatchArchive={handleBatchArchiveSessions}
                onBatchDelete={handleBatchDeleteSessions}
                onCreate={() => createSessionMutation.mutate(activeProvider)}
                onDelete={(sessionId) => deleteSessionMutation.mutate(sessionId)}
                onLoadMore={loadMoreSessions}
                onOpenSettings={() => {
                  setSidebarOpen(false);
                  setSettingsOpen(true);
                }}
                onPin={(sessionId, isPinned) => pinSessionMutation.mutate({ sessionId, isPinned })}
                onRename={(sessionId, title) =>
                  updateSessionMutation.mutate({ sessionId, input: { title } })
                }
                onSelect={(sessionId) => {
                  startTransition(() => setSelectedSessionId(sessionId));
                  setSidebarOpen(false);
                }}
                onToggleArchived={() => setSidebarArchivedOpen(!sidebarArchivedOpen)}
                onToggleArtifactFavorite={(id) => toggleFavoriteMutation.mutate(id)}
                onUnarchive={(sessionId) => unarchiveSessionMutation.mutate(sessionId)}
                sessions={sessions}
                showArchived={sidebarArchivedOpen}
                totalCount={sessionsTotal}
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
        sessionSources={sessionSources}
      />

      {artifactsDrawerOpen ? (
        <Suspense fallback={<ArtifactDrawerFallback onClose={() => setArtifactsDrawerOpen(false)} />}>
          <ArtifactDrawer
            activeFilter={artifactFilter}
            artifacts={artifactWorkspace.artifacts}
            errorMessage={artifactsError?.message ?? null}
            exportingArtifactId={exportArtifactMutation.isPending ? exportArtifactMutation.variables ?? null : null}
            isLoading={artifactWorkspace.isLoading}
            isOpen={artifactsDrawerOpen}
            mode={artifactBrowseMode}
            onClose={() => setArtifactsDrawerOpen(false)}
            onDelete={(id) => deleteArtifactMutation.mutate(id)}
            onExport={handleExportArtifact}
            onFilterChange={setArtifactFilter}
            onModeChange={handleArtifactModeChange}
            onRefine={(artifact, input) =>
              refineArtifactMutation.mutate({
                artifactId: artifact.id,
                instruction: input.instruction,
                customInstruction: input.customInstruction,
              })
            }
            onRevokeShare={handleRevokeArtifactShare}
            onSaveContent={(artifact, content) =>
              saveArtifactContentMutation.mutate({
                artifactId: artifact.id,
                content,
              })
            }
            onShare={handleShareArtifact}
            onStartQuizReview={setQuizReviewArtifact}
            onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
            refiningArtifactId={refineArtifactMutation.isPending ? refineArtifactMutation.variables?.artifactId ?? null : null}
            revokingArtifactId={revokeShareMutation.isPending ? revokeShareMutation.variables ?? null : null}
            savingArtifactId={saveArtifactContentMutation.isPending ? saveArtifactContentMutation.variables?.artifactId ?? null : null}
            sessionCount={artifactWorkspace.sessionCount}
            sharingArtifactId={shareArtifactMutation.isPending ? shareArtifactMutation.variables ?? null : null}
          />
        </Suspense>
      ) : null}

      {insightsOpen ? (
        <Suspense fallback={<LearningInsightsDrawerFallback onClose={() => setInsightsOpen(false)} />}>
          <LearningInsightsDrawer
            continueLearningSessions={continueLearningSessions}
            currentSessionId={selectedSessionId}
            errorMessage={learningInsightsError?.message ?? null}
            insights={learningInsightsQuery.data ?? null}
            isLoading={learningInsightsQuery.isLoading}
            isOpen={insightsOpen}
            onClose={() => setInsightsOpen(false)}
            onSelectSession={handleSelectInsightSession}
            providerErrorMessage={providerInsightsError?.message ?? null}
            providerIncidents={providerIncidentsQuery.data ?? null}
            providerLoading={
              providersQuery.isLoading || providerMetricsQuery.isLoading || providerIncidentsQuery.isLoading
            }
            providerMetrics={providerMetricsQuery.data ?? null}
            providers={providersQuery.data ?? null}
          />
        </Suspense>
      ) : null}

      {quizReviewArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-black/[0.05] bg-white/95 p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900/95">
            <Suspense fallback={<QuizReviewFallback />}>
              <QuizReviewMode
                artifact={quizReviewArtifact}
                onBack={() => setQuizReviewArtifact(null)}
                onRecordReviewEvent={({ artifact, itemIndex, selfAssessment }) =>
                  handleRecordArtifactReviewEvent(artifact, itemIndex, selfAssessment)
                }
              />
            </Suspense>
          </div>
        </div>
      )}

      <WorkspaceSettingsSheet
        activeProvider={activeProvider}
        aiRuntimeMode={currentSession?.aiRuntimeMode ?? DEFAULT_AI_RUNTIME_MODE}
        connectionState={connectionState}
        currentSession={currentSession}
        diagnostics={providerDiagnosticsQuery.data ?? null}
        diagnosticsError={providerDiagnosticsError?.message ?? null}
        diagnosticsLoading={providerDiagnosticsQuery.isFetching}
        draftTitle={draftTitle}
        hasExternalProviders={hasExternalProviders}
        isOpen={settingsOpen}
        isRuntimeModePending={runtimeModeMutation.isPending}
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
        onRuntimeModeChange={(mode) => {
          const currentRuntimeMode = currentSession?.aiRuntimeMode ?? DEFAULT_AI_RUNTIME_MODE;

          if (!currentSession) {
            toast.error("Hãy tạo hoặc chọn một phiên học trước khi đổi chế độ AI.");
            return;
          }

          if (mode === currentRuntimeMode) return;

          runtimeModeMutation.mutate({
            sessionId: currentSession.id,
            aiRuntimeMode: mode,
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
