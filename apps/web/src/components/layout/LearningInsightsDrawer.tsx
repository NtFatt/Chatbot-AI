import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Activity, AlertCircle, BarChart3, BookOpenText, Clock3, Layers3, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import type { ChatSessionSummary, LearningInsightsResponse } from '@chatbot-ai/shared';

import type {
  ProviderIncidentsResponse,
  ProviderMetricsResponse,
  ProviderResponse,
} from '../../services/providers-service';
import { cn } from '../../utils/cn';
import { formatRelativeTime, stripMarkdownPreview } from '../../utils/format';
import { IconButton } from '../ui/IconButton';

const artifactTypeLabels = {
  summary: 'Summaries',
  flashcard_set: 'Flashcards',
  quiz_set: 'Quizzes',
  note: 'Notes',
} as const;

const levelLabels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const;

const getProviderPulse = (
  providers: ProviderResponse | null,
  incidents: ProviderIncidentsResponse | null,
) => {
  if (!providers) {
    return {
      description: 'Pulling the latest provider snapshot.',
      label: 'Loading',
      tone: 'loading' as const,
    };
  }

  const configuredProviders = providers.providers.filter((provider) => provider.enabled && provider.configured);
  const healthyProviders = configuredProviders.filter((provider) => provider.healthState === 'healthy');
  const coolingDownProviders = configuredProviders.filter((provider) => provider.healthState === 'cooldown');
  const degradedProviders = configuredProviders.filter((provider) => provider.healthState === 'degraded');

  if (configuredProviders.length === 0) {
    return {
      description: providers.localFallbackEnabled
        ? 'No external provider is configured yet. Local fallback can still keep the workspace usable.'
        : 'No external provider is configured yet. Add at least one key before release smoke.',
      label: 'Setup required',
      tone: 'blocked' as const,
    };
  }

  if (healthyProviders.length > 0 && coolingDownProviders.length === 0 && degradedProviders.length === 0) {
    return {
      description:
        incidents && incidents.total > 0
          ? 'Primary AI paths are available, with recent recoverable incidents recorded.'
          : 'Primary AI paths are available and there are no recent provider incidents.',
      label: 'Healthy',
      tone: 'healthy' as const,
    };
  }

  if (healthyProviders.length > 0 || providers.localFallbackEnabled) {
    return {
      description:
        coolingDownProviders.length > 0
          ? 'At least one provider is cooling down, but the workspace still has a viable response path.'
          : 'Some providers are degraded, but there is still at least one usable response path.',
      label: 'Degraded',
      tone: 'warning' as const,
    };
  }

  return {
    description: 'Configured providers are currently unavailable. Expect fallback or failed requests until recovery.',
    label: 'Unavailable',
    tone: 'blocked' as const,
  };
};

const toneClasses = {
  healthy: 'border-emerald-500/18 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/18 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300',
  blocked: 'border-red-500/18 bg-red-500/[0.08] text-red-700 dark:text-red-300',
  loading: 'border-black/[0.08] bg-black/[0.03] text-ink/68 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300',
} as const;

const SectionCard = ({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
}) => (
  <section className="workspace-panel-subtle px-5 py-4.5">
    <div className="flex items-start gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/82 dark:border-white/10 dark:bg-slate-900/55">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="section-kicker">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-sm leading-6 text-ink/66 dark:text-slate-400">{subtitle}</p>
        ) : null}
        <div className="mt-3">{children}</div>
      </div>
    </div>
  </section>
);

export const LearningInsightsDrawer = ({
  continueLearningSessions,
  currentSessionId,
  errorMessage,
  insights,
  isLoading,
  isOpen,
  onClose,
  onSelectSession,
  providerErrorMessage,
  providerIncidents,
  providerLoading,
  providerMetrics,
  providers,
}: {
  continueLearningSessions: ChatSessionSummary[];
  currentSessionId: string | null;
  errorMessage?: string | null;
  insights: LearningInsightsResponse | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  providerErrorMessage?: string | null;
  providerIncidents: ProviderIncidentsResponse | null;
  providerLoading: boolean;
  providerMetrics: ProviderMetricsResponse | null;
  providers: ProviderResponse | null;
}) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const hasNoStudyData =
    insights != null &&
    insights.summary.totalSessions === 0 &&
    insights.summary.totalArtifacts === 0;
  const revisitSessions =
    continueLearningSessions.length > 0
      ? continueLearningSessions
      : insights?.recentSessions ?? [];
  const artifactMaxCount = Math.max(...(insights?.artifactBreakdown.map((item) => item.count) ?? [0]));
  const providerPulse = getProviderPulse(providers, providerIncidents);
  const providerMetricsByKey = new Map(
    (providerMetrics?.items ?? []).map((item) => [item.provider, item]),
  );
  const latestIncident = providerIncidents?.items[0] ?? null;

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] sm:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.15 }}
          />

          <motion.aside
            animate={{ x: 0 }}
            aria-modal="true"
            className="fixed bottom-0 right-0 top-0 z-50 flex w-[432px] max-w-[94vw] flex-col overflow-hidden rounded-l-[26px] border-l border-black/[0.08] bg-[rgba(250,252,255,0.98)] shadow-[0_26px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.97)]"
            data-testid="learning-insights-drawer"
            exit={{ x: '100%' }}
            initial={{ x: '100%' }}
            role="dialog"
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ocean/10 text-ocean dark:bg-cyan/15 dark:text-cyan">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">Learning Insights</p>
                  <p className="text-xs leading-5 text-ink/62 dark:text-slate-400">
                    Quick study progress and runtime pulse
                  </p>
                </div>
              </div>

              <IconButton icon={<X className="h-4 w-4" />} onClick={onClose} tooltip="Close" variant="ghost" />
            </div>

            <div className="app-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {isLoading && !insights ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div className="surface-card h-24 animate-pulse" key={index} />
                    ))}
                  </div>
                  <div className="surface-card h-44 animate-pulse" />
                  <div className="surface-card h-44 animate-pulse" />
                </>
              ) : null}

              {!isLoading && errorMessage ? (
                <div className="rounded-2xl border border-red-500/18 bg-red-500/[0.08] px-4 py-3 text-sm">
                  <p className="font-semibold text-red-700 dark:text-red-300">Could not load learning insights</p>
                  <p className="mt-1 leading-6 text-red-700/90 dark:text-red-200/90">{errorMessage}</p>
                </div>
              ) : null}

              {!isLoading && insights && hasNoStudyData ? (
                <SectionCard
                  icon={<Sparkles className="h-4 w-4 text-ocean dark:text-cyan" />}
                  subtitle="Sessions, artifacts, and study focus will appear here once you start using the workspace."
                  title="No study history yet"
                >
                  <p className="rounded-2xl border border-dashed border-black/[0.08] bg-black/[0.02] p-4 text-sm leading-6 text-ink/62 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                    Start one study session, generate an artifact, or revisit a lesson. This panel will then show what you have learned and what is worth coming back to.
                  </p>
                </SectionCard>
              ) : null}

              {insights && !hasNoStudyData ? (
                <>
                  <SectionCard
                    icon={<Clock3 className="h-4 w-4 text-ocean dark:text-cyan" />}
                    subtitle={
                      insights.summary.lastActivityAt
                        ? `Last study activity ${formatRelativeTime(insights.summary.lastActivityAt)}`
                        : 'No study activity recorded yet.'
                    }
                    title="Study summary"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="surface-card px-3.5 py-3.5" data-testid="learning-kpi-sessions">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Sessions</p>
                        <p className="mt-1 text-2xl font-semibold">{insights.summary.totalSessions}</p>
                      </div>
                      <div className="surface-card px-3.5 py-3.5" data-testid="learning-kpi-active-7d">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Active 7d</p>
                        <p className="mt-1 text-2xl font-semibold">{insights.summary.activeSessionsLast7Days}</p>
                      </div>
                      <div className="surface-card px-3.5 py-3.5" data-testid="learning-kpi-artifacts">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Artifacts</p>
                        <p className="mt-1 text-2xl font-semibold">{insights.summary.totalArtifacts}</p>
                      </div>
                      <div className="surface-card px-3.5 py-3.5" data-testid="learning-kpi-favorites">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Favorites</p>
                        <p className="mt-1 text-2xl font-semibold">{insights.summary.favoriteArtifacts}</p>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    icon={<Layers3 className="h-4 w-4 text-ocean dark:text-cyan" />}
                    subtitle="See which study asset formats you have relied on the most."
                    title="Artifact mix"
                  >
                    {insights.artifactBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {insights.artifactBreakdown.map((item) => {
                          const width = artifactMaxCount > 0 ? Math.max((item.count / artifactMaxCount) * 100, 12) : 0;
                          return (
                            <div key={item.type}>
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-medium text-ink dark:text-slate-100">{artifactTypeLabels[item.type]}</span>
                                <span className="text-ink/62 dark:text-slate-400">{item.count}</span>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                                <div
                                  className="h-full rounded-full bg-ocean dark:bg-cyan"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-black/[0.08] bg-black/[0.02] p-4 text-center text-xs leading-5 text-ink/58 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-500">
                        Artifact trends will appear after you save your first study asset.
                      </p>
                    )}
                  </SectionCard>

                  <SectionCard
                    icon={<BookOpenText className="h-4 w-4 text-ocean dark:text-cyan" />}
                    subtitle="Derived from existing session intelligence metadata on assistant responses."
                    title="Study focus"
                  >
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="surface-card px-3.5 py-3.5">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Subjects</p>
                        <div className="mt-3 space-y-2">
                          {insights.topSubjects.length > 0 ? insights.topSubjects.map((item) => (
                            <div className="flex items-center justify-between gap-3 text-sm" key={item.label}>
                              <span className="truncate font-medium text-ink dark:text-slate-100">{item.label}</span>
                              <span className="text-ink/62 dark:text-slate-400">{item.count}</span>
                            </div>
                          )) : (
                            <p className="text-xs leading-5 text-ink/58 dark:text-slate-500">Not enough subject signals yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="surface-card px-3.5 py-3.5">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Topics</p>
                        <div className="mt-3 space-y-2">
                          {insights.topTopics.length > 0 ? insights.topTopics.map((item) => (
                            <div className="flex items-center justify-between gap-3 text-sm" key={item.label}>
                              <span className="truncate font-medium text-ink dark:text-slate-100">{item.label}</span>
                              <span className="text-ink/62 dark:text-slate-400">{item.count}</span>
                            </div>
                          )) : (
                            <p className="text-xs leading-5 text-ink/58 dark:text-slate-500">Topics will appear after a few assisted turns.</p>
                          )}
                        </div>
                      </div>

                      <div className="surface-card px-3.5 py-3.5">
                        <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Levels</p>
                        <div className="mt-3 space-y-2">
                          {insights.topLevels.length > 0 ? insights.topLevels.map((item) => (
                            <div className="flex items-center justify-between gap-3 text-sm" key={item.level}>
                              <span className="truncate font-medium text-ink dark:text-slate-100">{levelLabels[item.level]}</span>
                              <span className="text-ink/62 dark:text-slate-400">{item.count}</span>
                            </div>
                          )) : (
                            <p className="text-xs leading-5 text-ink/58 dark:text-slate-500">Level hints will appear after more classified answers.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    icon={<Sparkles className="h-4 w-4 text-ocean dark:text-cyan" />}
                    subtitle={
                      continueLearningSessions.length > 0
                        ? 'These sessions have been quiet for a while and are good candidates to resume.'
                        : 'No dormant sessions stood out, so this falls back to your most recent activity.'
                    }
                    title="Worth revisiting"
                  >
                    {revisitSessions.length > 0 ? (
                      <div className="space-y-2.5">
                        {revisitSessions.map((session) => (
                          <button
                            className={cn(
                              'focus-ring surface-card-interactive w-full px-4 py-3.5 text-left',
                              session.id === currentSessionId
                                ? 'border-ocean/18 bg-ocean/[0.08] dark:border-cyan/20 dark:bg-cyan/[0.08]'
                                : '',
                            )}
                            key={session.id}
                            onClick={() => onSelectSession(session.id)}
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink dark:text-slate-100">{session.title}</p>
                                <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-slate-400">
                                  {session.messageCount} messages · {session.artifactCount} artifacts
                                  {session.lastMessagePreview
                                    ? ` · ${stripMarkdownPreview(session.lastMessagePreview).slice(0, 72)}`
                                    : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink/44 dark:text-slate-500">
                                  {session.id === currentSessionId ? 'Current' : 'Open'}
                                </p>
                                <p className="mt-1 text-xs text-ink/62 dark:text-slate-400">
                                  {formatRelativeTime(session.updatedAt)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-black/[0.08] bg-black/[0.02] p-4 text-center text-xs leading-5 text-ink/58 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-500">
                        Keep studying and this space will highlight the sessions worth returning to.
                      </p>
                    )}
                  </SectionCard>
                </>
              ) : null}

              <SectionCard
                icon={<Activity className="h-4 w-4 text-ocean dark:text-cyan" />}
                subtitle={providerPulse.description}
                title="Provider pulse"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold',
                      toneClasses[providerPulse.tone],
                    )}
                    data-testid="learning-provider-pulse-status"
                  >
                    {providerPulse.label}
                  </span>
                  {latestIncident ? (
                    <span className="text-xs text-ink/58 dark:text-slate-400">
                      Latest incident: {latestIncident.provider} · {latestIncident.errorCode}
                    </span>
                  ) : null}
                </div>

                {providerErrorMessage ? (
                  <div className="mt-3 rounded-2xl border border-amber-500/18 bg-amber-500/[0.08] px-4 py-3 text-sm">
                    <p className="font-medium text-amber-700 dark:text-amber-300">Provider summary is partial</p>
                    <p className="mt-1 leading-6 text-amber-700/90 dark:text-amber-200/90">{providerErrorMessage}</p>
                  </div>
                ) : null}

                {providerLoading && !providers && !providerMetrics ? (
                  <div className="mt-3 space-y-3">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div className="surface-card h-20 animate-pulse" key={index} />
                    ))}
                  </div>
                ) : null}

                {providers?.providers.length ? (
                  <div className="mt-3 space-y-2.5">
                    {providers.providers.map((provider) => {
                      const metrics = providerMetricsByKey.get(provider.key);
                      return (
                        <div className="surface-card px-4 py-3.5" key={provider.key}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink dark:text-slate-100">{provider.key}</p>
                              <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-slate-400">
                                {provider.model} · {provider.enabled && provider.configured ? provider.healthState : provider.configured ? 'disabled' : 'not configured'}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                provider.healthState === 'healthy'
                                  ? toneClasses.healthy
                                  : provider.healthState === 'cooldown'
                                    ? toneClasses.warning
                                    : toneClasses.blocked,
                              )}
                            >
                              {provider.healthState}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-ink/62 dark:text-slate-400">
                            <div>
                              <p className="uppercase tracking-[0.12em] text-ink/44 dark:text-slate-500">Requests</p>
                              <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">{metrics?.totalRequests ?? 0}</p>
                            </div>
                            <div>
                              <p className="uppercase tracking-[0.12em] text-ink/44 dark:text-slate-500">Failures</p>
                              <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">{metrics?.failureCount ?? 0}</p>
                            </div>
                            <div>
                              <p className="uppercase tracking-[0.12em] text-ink/44 dark:text-slate-500">Fallbacks</p>
                              <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">{metrics?.fallbackCount ?? 0}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {!providerLoading && !providers?.providers.length ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-black/[0.08] bg-black/[0.02] p-4 text-center text-xs leading-5 text-ink/58 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-500">
                    Provider status will appear here once runtime configuration is available.
                  </p>
                ) : null}

                {!providerLoading && providerIncidents && providerIncidents.total === 0 ? (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-ink/60 dark:text-slate-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    No recent provider incidents.
                  </div>
                ) : null}
              </SectionCard>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
};
