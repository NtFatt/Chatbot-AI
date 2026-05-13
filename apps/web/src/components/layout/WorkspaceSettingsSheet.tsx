import { useEffect } from 'react';
import { LogOut, Moon, Radio, Save, Settings2, Sun, X } from 'lucide-react';

import type { AiRuntimeMode, ChatSessionSummary, ProviderKey } from '@chatbot-ai/shared';
import { AI_RUNTIME_MODE_LABELS, AI_RUNTIME_MODES } from '@chatbot-ai/shared';

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
  internal_l3_tutor:
    'Model nội bộ Level 3 của app, ưu tiên tutor policy, tài liệu truy xuất và phản hồi học tập có kiểm soát.',
};

const connectionLabels = {
  connected: 'Trực tuyến',
  reconnecting: 'Đang kết nối lại',
  disconnected: 'Dự phòng',
} as const;

export const WorkspaceSettingsSheet = ({
  activeProvider,
  aiRuntimeMode,
  connectionState,
  currentSession,
  diagnostics,
  diagnosticsError,
  diagnosticsLoading,
  draftTitle,
  hasExternalProviders,
  isOpen,
  isRuntimeModePending,
  isSavingTitle,
  onClose,
  onDraftTitleChange,
  onLogout,
  onProviderChange,
  onRuntimeModeChange,
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
  aiRuntimeMode: AiRuntimeMode;
  connectionState: 'connected' | 'reconnecting' | 'disconnected';
  currentSession: ChatSessionSummary | null;
  diagnostics: ProviderDiagnosticsResponse | null;
  diagnosticsError?: string | null;
  diagnosticsLoading: boolean;
  draftTitle: string;
  hasExternalProviders: boolean;
  isOpen: boolean;
  isRuntimeModePending: boolean;
  isSavingTitle: boolean;
  onClose: () => void;
  onDraftTitleChange: (value: string) => void;
  onLogout: () => void;
  onProviderChange: (provider: ProviderKey) => void;
  onRuntimeModeChange: (mode: AiRuntimeMode) => void;
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

      <aside className="relative flex h-full w-full max-w-[468px] flex-col border-l border-black/[0.08] bg-white/96 shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[rgba(2,6,23,0.92)]">
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-6 py-5 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/82 dark:border-white/10 dark:bg-slate-900/55">
                <Settings2 className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-[22px] font-semibold tracking-[-0.04em]">Workspace settings</p>
                <p className="mt-1 text-sm leading-6 text-ink/68 dark:text-slate-300">
                  Tinh gọn các điều khiển hệ thống để khu chat luôn tập trung vào học tập.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={onClose} size="icon" type="button" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
          <section className="workspace-panel-subtle px-5 py-4.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-kicker">AI status</p>
                <p className="mt-2 text-lg font-semibold">{overallAiState}</p>
                <p className="mt-1 text-sm leading-6 text-ink/68 dark:text-slate-400">
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

          {/* — AI Runtime Mode Switch — */}
          <section className="mt-4 workspace-panel-subtle px-5 py-4.5" data-testid="runtime-mode-section">
            <p className="section-kicker">Chế độ AI</p>
            <div className="mt-3 grid gap-2" role="radiogroup" aria-label="Chế độ AI">
              {AI_RUNTIME_MODES.map((mode) => {
                const label = AI_RUNTIME_MODE_LABELS[mode];
                const isSelected = mode === aiRuntimeMode;

                return (
                  <button
                    aria-checked={isSelected}
                    aria-label={label.vi}
                    className={cn(
                      'focus-ring relative flex w-full flex-col rounded-2xl border px-4 py-3.5 text-left transition-all',
                      isSelected
                        ? 'border-ocean/40 bg-ocean/[0.06] shadow-[0_4px_18px_rgba(15,139,141,0.10)] dark:border-cyan/30 dark:bg-cyan/[0.06]'
                        : 'border-black/[0.08] bg-white/92 hover:border-black/[0.14] hover:bg-white dark:border-white/10 dark:bg-slate-900/55 dark:hover:bg-slate-900/72',
                      (isRuntimeModePending || !currentSession) && 'pointer-events-none opacity-60')}
                    data-testid={`runtime-mode-${mode}`}
                    disabled={isRuntimeModePending || !currentSession} key={mode}
                    onClick={() => onRuntimeModeChange(mode)}
                    role="radio"
                    type="button"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                          isSelected
                            ? 'border-ocean dark:border-cyan'
                            : 'border-black/20 dark:border-white/20',
                        )}
                      >
                        {isSelected && (
                          <span className="h-2.5 w-2.5 rounded-full bg-ocean dark:bg-cyan" />
                        )}
                      </span>
                      <span className="text-sm font-semibold">{label.vi}</span>
                    </div>
                    <p className="mt-1.5 pl-[30px] text-xs leading-5 text-ink/62 dark:text-slate-400">
                      {label.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {!currentSession ? (
              <p className="mt-3 text-[11px] font-medium leading-[18px] text-amber-600 dark:text-amber-500">
                Hãy tạo hoặc chọn một phiên học trước khi đổi chế độ AI.
              </p>
            ) : (
              <p className="mt-3 text-[11px] leading-[18px] text-ink/50 dark:text-slate-500">
                AI học tập Level 3 dùng model nội bộ của app: tutor policy, tài liệu truy xuất, dataset, evaluation, model registry và pipeline fine-tune-ready. Chế độ này không gọi Gemini/OpenAI mặc định; external fallback chỉ bật bằng cấu hình hệ thống.
              </p>
            )}
          </section>

          <section className="mt-4 workspace-panel-subtle px-5 py-4.5">
            <p className="section-kicker">Phiên hiện tại</p>
            {currentSession ? (
              <>
                <div className="mt-3 flex gap-2">
                  <input
                    className="focus-ring h-11 flex-1 rounded-[18px] border border-black/[0.08] bg-white/92 px-4 text-sm outline-none dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100"
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
                            ? 'border-transparent bg-ocean text-white shadow-[0_10px_22px_rgba(15,139,141,0.18)] dark:bg-cyan dark:text-ink'
                            : 'border-black/[0.08] bg-white/92 text-ink/72 hover:border-black/[0.12] hover:bg-white dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:bg-slate-900/72',
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
                  <p className="mt-3 text-sm leading-6 text-ink/66 dark:text-slate-400">
                    {providerDescriptions[activeProvider]}
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-ink/66 dark:text-slate-400">
                Chọn một cuộc trò chuyện ở sidebar để đổi tên hoặc tuỳ chỉnh provider cho phiên đó.
              </p>
            )}
          </section>

          {usage ? (
            <section className="mt-4 workspace-panel-subtle px-5 py-4.5">
              <p className="section-kicker">Usage phiên hiện tại</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="surface-card px-3.5 py-3.5">
                  <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Requests</p>
                  <p className="mt-1 text-lg font-semibold">{usage.summary.requests}</p>
                </div>
                <div className="surface-card px-3.5 py-3.5">
                  <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Tokens</p>
                  <p className="mt-1 text-lg font-semibold">{usage.summary.tokens}</p>
                </div>
                <div className="surface-card px-3.5 py-3.5">
                  <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Fallbacks</p>
                  <p className="mt-1 text-lg font-semibold">{usage.summary.fallbacks}</p>
                </div>
                <div className="surface-card px-3.5 py-3.5">
                  <p className="text-xs uppercase tracking-[0.12em] text-ink/55 dark:text-slate-500">Estimated cost</p>
                  <p className="mt-1 text-lg font-semibold">${usage.summary.cost.toFixed(4)}</p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="mt-4 workspace-panel-subtle px-5 py-4.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Diagnostics</p>
                <p className="mt-2 text-sm leading-6 text-ink/66 dark:text-slate-400">
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

          <section className="mt-4 grid gap-3">
            <button
              className="focus-ring surface-card-interactive flex items-center justify-between px-4 py-3.5 text-left"
              onClick={onToggleTheme}
              type="button"
            >
              <div>
                <p className="text-sm font-semibold">Giao diện</p>
                <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-slate-400">Đổi giữa chế độ sáng và tối.</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white/92 dark:border-white/10 dark:bg-slate-900/55">
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
            </button>

            <button
              className="focus-ring surface-card-interactive flex items-center justify-between px-4 py-3.5 text-left"
              onClick={onLogout}
              type="button"
            >
              <div>
                <p className="text-sm font-semibold">Thoát workspace</p>
                <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-slate-400">
                  Xóa phiên đăng nhập trên thiết bị hiện tại.
                </p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white/92 dark:border-white/10 dark:bg-slate-900/55">
                <LogOut className="h-4 w-4" />
              </span>
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
};
