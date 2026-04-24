import { AlertTriangle, Activity, Zap } from 'lucide-react';

import type { ProviderDiagnosticsResponse, ProviderIncidentsResponse, ProviderMetricsResponse } from '../../services/providers-service';
import { ProviderBadge } from '../chat/ProviderBadge';

export const ProviderDiagnosticsPanel = ({
  diagnostics,
  metrics,
  incidents,
  loading,
  errorMessage,
}: {
  diagnostics: ProviderDiagnosticsResponse | null;
  metrics: ProviderMetricsResponse | null;
  incidents: ProviderIncidentsResponse | null;
  loading: boolean;
  errorMessage?: string | null;
}) => {
  const allProvidersMissingKeys =
    Boolean(diagnostics?.providers.length) &&
    (diagnostics?.providers ?? []).every((provider) => provider.status === 'missing_key');

  return (
    <section className="workspace-panel-subtle px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Provider diagnostics</p>
          <p className="mt-1 text-xs leading-5 text-ink/58 dark:text-slate-400">
            Theo dõi readiness, độ trễ và lỗi gần nhất của từng provider.
          </p>
        </div>
        <span className="rounded-full border border-black/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-ink/62 dark:border-white/10 dark:text-slate-300">
          {loading
            ? 'checking'
            : allProvidersMissingKeys
              ? 'setup required'
              : diagnostics?.realAiAvailable
                ? 'ready'
                : 'degraded'}
        </span>
      </div>

      {errorMessage ? (
        <div className="mt-3 rounded-[18px] border border-red-500/20 bg-red-500/6 px-3 py-3 text-sm text-red-600 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {diagnostics?.providers.map((provider) => {
          const metric = metrics?.items.find((item) => item.provider === provider.key);
          return (
            <div
              className="rounded-[18px] border border-black/[0.06] bg-white/84 px-3.5 py-3 dark:border-white/10 dark:bg-slate-950/45"
              key={provider.key}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <ProviderBadge
                    fallbackUsed={provider.key === diagnostics.fallbackProvider}
                    model={provider.model}
                    provider={provider.key}
                  />
                  <p className="mt-2 text-sm leading-6 text-ink/68 dark:text-slate-300">{provider.message}</p>
                </div>
                <span className="rounded-full bg-black/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-ink/60 dark:bg-white/[0.04] dark:text-slate-300">
                  {provider.status}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-ink/58 dark:text-slate-400 sm:grid-cols-3">
                <div className="inline-flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" />
                  {provider.latencyMs ? `${provider.latencyMs} ms` : 'No live ping'}
                </div>
                <div className="inline-flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" />
                  {metric ? `${metric.totalRequests} requests` : 'No usage yet'}
                </div>
                <div>{metric ? `${metric.failureCount} lỗi · ${metric.fallbackCount} fallback` : 'No incident summary'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {incidents && incidents.items.length > 0 ? (
        <div className="mt-4 rounded-[18px] border border-black/[0.06] bg-white/72 px-3.5 py-3 dark:border-white/10 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">Sự cố gần đây</p>
          </div>
          <div className="mt-3 space-y-2">
            {incidents.items.slice(0, 4).map((incident) => (
              <div
                className="rounded-[14px] border border-black/6 bg-black/[0.02] px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]"
                key={incident.id}
              >
                <p className="font-medium">
                  {incident.provider} · {incident.errorCode}
                </p>
                <p className="mt-1 leading-5 text-ink/62 dark:text-slate-400">{incident.errorMessage}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
