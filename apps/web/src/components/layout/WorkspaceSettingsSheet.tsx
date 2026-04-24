import { useEffect } from 'react';
import { LogOut, Moon, Radio, Save, Settings2, Sun, X } from 'lucide-react';

import type { ChatSessionSummary, ProviderKey } from '@chatbot-ai/shared';

import type {
  ProviderDiagnosticsResponse,
  ProviderIncidentsResponse,
  ProviderMetricsResponse,
} from '../../services/providers-service';
import type { ChatUsageResponse } from '../../services/usage-service';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { ProviderDiagnosticsPanel } from './ProviderDiagnosticsPanel';

const providerDescriptions: Record<ProviderKey, string> = {
  GEMINI: 'Phản hồi nhanh, phù hợp cho các vòng hỏi đáp liên tục khi đang học.',
  OPENAI: 'Hợp hơn khi bạn muốn lời giải kỹ, mạch lạc và có chiều sâu phân tích.',
};

const connectionLabels = {
  connected: 'Trực tuyến',
  reconnecting: 'Đang kết nối lại',
  disconnected: 'Dự phòng',
} as const;

export const WorkspaceSettingsSheet = ({
  activeProvider,
  connectionState,
  currentSession,
  diagnostics,
  diagnosticsError,
  diagnosticsLoading,
  draftTitle,
  hasExternalProviders,
  isOpen,
  isSavingTitle,
  onClose,
  onDraftTitleChange,
  onLogout,
  onProviderChange,
  onRunDiagnostics,
  onSaveTitle,
  onToggleTheme,
  providerIncidents,
  providerMetrics,
  providerOptions,
  theme,
  usage,
}: {
  activeProvider: ProviderKey;
  connectionState: 'connected' | 'reconnecting' | 'disconnected';
  currentSession: ChatSessionSummary | null;
  diagnostics: ProviderDiagnosticsResponse | null;
  diagnosticsError?: string | null;
  diagnosticsLoading: boolean;
  draftTitle: string;
  hasExternalProviders: boolean;
  isOpen: boolean;
  isSavingTitle: boolean;
  onClose: () => void;
  onDraftTitleChange: (value: string) => void;
  onLogout: () => void;
  onProviderChange: (provider: ProviderKey) => void;
  onRunDiagnostics: () => void;
  onSaveTitle: () => void;
  onToggleTheme: () => void;
  providerIncidents: ProviderIncidentsResponse | null;
  providerMetrics: ProviderMetricsResponse | null;
  providerOptions: ProviderKey[];
  theme: 'light' | 'dark';
  usage: ChatUsageResponse | null;
}) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const trimmedTitle = draftTitle.trim();
  const canSaveTitle =
    Boolean(currentSession) &&
    trimmedTitle.length > 0 &&
    trimmedTitle !== currentSession?.title &&
    !isSavingTitle;

  const overallAiState = diagnostics
    ? diagnostics.realAiAvailable
      ? 'AI thật sẵn sàng'
      : diagnostics.localFallbackEnabled
        ? 'Fallback đang chờ'
        : 'Chưa khả dụng'
    : hasExternalProviders
      ? 'Chưa kiểm tra'
      : 'Thiếu cấu hình';

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex justify-end" data-testid="settings-sheet" role="dialog">
      <button
        aria-label="Đóng bảng cài đặt"
        className="absolute inset-0 bg-slate-950/24 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />

      <aside className="relative flex h-full w-full max-w-[460px] flex-col border-l border-black/[0.06] bg-white/94 shadow-[0_24px_90px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[rgba(2,6,23,0.9)]">
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.05] px-5 py-5 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/82 dark:border-white/10 dark:bg-slate-900/55">
                <Settings2 className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-[22px] font-semibold tracking-[-0.04em]">Workspace settings</p>
                <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-slate-300">
                  Tinh gọn các điều khiển hệ thống để khu chat luôn tập trung vào học tập.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={onClose} size="icon" type="button" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
          <section className="workspace-panel-subtle px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-kicker">AI status</p>
                <p className="mt-2 text-lg font-semibold">{overallAiState}</p>
                <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-slate-400">
                  {diagnostics?.realAiAvailable
                    ? 'Ít nhất một provider thật đang phản hồi được.'
                    : hasExternalProviders
                      ? 'AI thật đã được cấu hình, nhưng bạn nên chạy diagnostics để kiểm tra readiness.'
                      : 'Hệ thống chưa có provider thật khả dụng; local fallback sẽ tiếp tục bảo toàn luồng học.'}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium',
                  connectionState === 'connected'
                    ? 'border-emerald-500/18 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300'
                    : 'border-amber-500/18 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300',
                )}
              >
                <Radio className="h-3.5 w-3.5" />
                {connectionLabels[connectionState]}
              </span>
            </div>
          </section>

          <section className="mt-4 workspace-panel-subtle px-4 py-4">
            <p className="section-kicker">Phiên hiện tại</p>
            {currentSession ? (
              <>
                <div className="mt-3 flex gap-2">
                  <input
                    className="focus-ring h-11 flex-1 rounded-[18px] border border-black/[0.08] bg-white/84 px-4 text-sm outline-none dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100"
                    id="settings-session-title"
                    onChange={(event) => onDraftTitleChange(event.target.value)}
                    placeholder="Đặt tên gợi nhớ cho phiên học"
                    value={draftTitle}
                  />
                  <Button
                    disabled={!canSaveTitle}
                    leading={<Save className="h-4 w-4" />}
                    onClick={onSaveTitle}
                    type="button"
                    variant="secondary"
                  >
                    Lưu
                  </Button>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink/44 dark:text-slate-500">
                    Provider trả lời
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {providerOptions.map((provider) => (
                      <button
                        className={cn(
                          'focus-ring rounded-full border px-3.5 py-2 text-xs font-semibold transition',
                          provider === activeProvider
                            ? 'border-transparent bg-ink text-white dark:bg-white dark:text-ink'
                            : 'border-black/[0.08] bg-white/84 text-ink/72 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-300',
                        )}
                        disabled={!currentSession}
                        data-testid={`provider-option-${provider}`}
                        key={provider}
                        onClick={() => onProviderChange(provider)}
                        type="button"
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/58 dark:text-slate-400">
                    {providerDescriptions[activeProvider]}
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-ink/60 dark:text-slate-400">
                Chọn một cuộc trò chuyện ở sidebar để đổi tên hoặc tuỳ chỉnh provider cho phiên đó.
              </p>
            )}
          </section>

          {usage ? (
            <section className="mt-4 workspace-panel-subtle px-4 py-4">
              <p className="section-kicker">Usage phiên hiện tại</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-black/[0.06] px-3 py-3 dark:border-white/10">
                  <p className="text-xs uppercase tracking-[0.12em] text-ink/45 dark:text-slate-500">Requests</p>
                  <p className="mt-1 text-lg font-semibold">{usage.summary.requests}</p>
                </div>
                <div className="rounded-[18px] border border-black/[0.06] px-3 py-3 dark:border-white/10">
                  <p className="text-xs uppercase tracking-[0.12em] text-ink/45 dark:text-slate-500">Tokens</p>
                  <p className="mt-1 text-lg font-semibold">{usage.summary.tokens}</p>
                </div>
                <div className="rounded-[18px] border border-black/[0.06] px-3 py-3 dark:border-white/10">
                  <p className="text-xs uppercase tracking-[0.12em] text-ink/45 dark:text-slate-500">Fallbacks</p>
                  <p className="mt-1 text-lg font-semibold">{usage.summary.fallbacks}</p>
                </div>
                <div className="rounded-[18px] border border-black/[0.06] px-3 py-3 dark:border-white/10">
                  <p className="text-xs uppercase tracking-[0.12em] text-ink/45 dark:text-slate-500">Estimated cost</p>
                  <p className="mt-1 text-lg font-semibold">${usage.summary.cost.toFixed(4)}</p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="mt-4 workspace-panel-subtle px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Diagnostics</p>
                <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-slate-400">
                  Kiểm tra readiness, độ trễ và sự cố gần đây của từng provider.
                </p>
              </div>
              <Button onClick={onRunDiagnostics} size="sm" type="button" variant="secondary">
                {diagnosticsLoading ? 'Đang kiểm tra...' : 'Kiểm tra'}
              </Button>
            </div>
          </section>

          <section className="mt-4">
            <ProviderDiagnosticsPanel
              diagnostics={diagnostics}
              errorMessage={diagnosticsError}
              incidents={providerIncidents}
              loading={diagnosticsLoading}
              metrics={providerMetrics}
            />
          </section>

          <section className="mt-4 grid gap-2">
            <button
              className="focus-ring flex items-center justify-between rounded-[20px] border border-black/[0.08] bg-white/84 px-4 py-3 text-left transition hover:border-black/[0.12] dark:border-white/10 dark:bg-slate-900/55"
              onClick={onToggleTheme}
              type="button"
            >
              <div>
                <p className="text-sm font-semibold">Giao diện</p>
                <p className="mt-1 text-xs leading-5 text-ink/56 dark:text-slate-400">Đổi giữa chế độ sáng và tối.</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/10">
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
            </button>

            <button
              className="focus-ring flex items-center justify-between rounded-[20px] border border-black/[0.08] bg-white/84 px-4 py-3 text-left transition hover:border-black/[0.12] dark:border-white/10 dark:bg-slate-900/55"
              onClick={onLogout}
              type="button"
            >
              <div>
                <p className="text-sm font-semibold">Thoát workspace</p>
                <p className="mt-1 text-xs leading-5 text-ink/56 dark:text-slate-400">
                  Xóa phiên đăng nhập trên thiết bị hiện tại.
                </p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/10">
                <LogOut className="h-4 w-4" />
              </span>
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
};
