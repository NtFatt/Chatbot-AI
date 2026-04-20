import { useEffect } from 'react';
import {
  LogOut,
  Moon,
  Radio,
  Save,
  Settings2,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';

import type { ChatSessionSummary, MaterialRecommendation, ProviderKey } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import type { ProviderDiagnosticsResponse } from '../../services/providers-service';
import { MaterialsPanel } from '../materials/MaterialsPanel';
import { Button } from '../ui/Button';

const providerDescriptions: Record<ProviderKey, string> = {
  GEMINI: 'Ưu tiên tốc độ phản hồi và phù hợp cho các phiên học cần trao đổi nhanh.',
  OPENAI: 'Phù hợp hơn khi bạn muốn lời giải mạch lạc, chi tiết và có chiều sâu hơn.',
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
  errorMessage,
  hasExternalProviders,
  isLoading,
  isOpen,
  isSavingTitle,
  materials,
  onClose,
  onDraftTitleChange,
  onLogout,
  onProviderChange,
  onRetry,
  onRunDiagnostics,
  onSaveTitle,
  onSearchChange,
  onToggleTheme,
  providerOptions,
  searchValue,
  theme,
}: {
  activeProvider: ProviderKey;
  connectionState: 'connected' | 'reconnecting' | 'disconnected';
  currentSession: ChatSessionSummary | null;
  diagnostics: ProviderDiagnosticsResponse | null;
  diagnosticsError?: string | null;
  diagnosticsLoading: boolean;
  draftTitle: string;
  errorMessage?: string | null;
  hasExternalProviders: boolean;
  isLoading: boolean;
  isOpen: boolean;
  isSavingTitle: boolean;
  materials: MaterialRecommendation[];
  onClose: () => void;
  onDraftTitleChange: (value: string) => void;
  onLogout: () => void;
  onProviderChange: (provider: ProviderKey) => void;
  onRetry?: () => void;
  onRunDiagnostics: () => void;
  onSaveTitle: () => void;
  onSearchChange: (value: string) => void;
  onToggleTheme: () => void;
  providerOptions: ProviderKey[];
  searchValue: string;
  theme: 'light' | 'dark';
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
      ? 'Đã sẵn sàng'
      : 'Chưa sẵn sàng'
    : hasExternalProviders
      ? 'Chưa kiểm tra'
      : 'Thiếu cấu hình';

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex justify-end" role="dialog">
      <button
        aria-label="Đóng bảng cài đặt"
        className="absolute inset-0 bg-slate-950/24 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />

      <aside className="relative flex h-full w-full max-w-[460px] flex-col border-l border-black/8 bg-white/92 shadow-[0_24px_90px_rgba(15,23,32,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[rgba(2,6,23,0.88)]">
        <div className="flex items-start justify-between gap-3 border-b border-black/5 px-5 py-5 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/80 dark:border-white/10 dark:bg-slate-900/55">
                <Settings2 className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-xl font-semibold tracking-[-0.03em]">Settings</p>
                <p className="mt-1 text-sm leading-6 text-ink/62 dark:text-slate-300">
                  Tùy chỉnh phiên học và mở tài liệu mà không chiếm không gian đọc chính.
                </p>
              </div>
            </div>
          </div>

          <button
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/80 dark:border-white/10 dark:bg-slate-900/55"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
          <section className="border-b border-black/5 pb-5 dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 dark:text-slate-400">
                  Trạng thái phiên
                </p>
                <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-slate-300">
                  Tất cả tùy chỉnh phụ được gom về đây để khu chat ở giữa luôn thoáng và dễ đọc.
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]',
                  connectionState === 'connected'
                    ? 'border-emerald-500/18 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300'
                    : 'border-amber-500/18 bg-amber-500/8 text-amber-700 dark:text-amber-300',
                )}
              >
                <Radio className="h-3.5 w-3.5" />
                {connectionLabels[connectionState]}
              </span>
            </div>

            <div className="mt-5 rounded-[22px] border border-black/8 bg-white/72 px-4 py-4 dark:border-white/10 dark:bg-slate-900/55">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 dark:text-slate-400">
                    Trạng thái AI thật
                  </p>
                  <p className="mt-2 text-sm font-semibold">{overallAiState}</p>
                  <p className="mt-1 text-xs leading-5 text-ink/58 dark:text-slate-400">
                    {diagnostics?.realAiAvailable
                      ? 'Ít nhất một provider thật đang phản hồi được.'
                      : 'Kiểm tra kết nối để biết chính xác provider nào đang dùng được.'}
                  </p>
                </div>
                <Button
                  className="h-10 bg-white/85 px-4 text-ink dark:bg-slate-950/80 dark:text-white"
                  onClick={onRunDiagnostics}
                  type="button"
                >
                  {diagnosticsLoading ? 'Đang kiểm tra...' : 'Kiểm tra'}
                </Button>
              </div>

              {diagnosticsError ? (
                <p className="mt-3 text-sm leading-6 text-red-600 dark:text-red-300">{diagnosticsError}</p>
              ) : null}

              {diagnostics ? (
                <div className="mt-4 space-y-3">
                  {diagnostics.providers.map((provider) => (
                    <div
                      className="rounded-[18px] border border-black/8 bg-white/78 px-3.5 py-3 dark:border-white/10 dark:bg-slate-950/55"
                      key={provider.key}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{provider.key}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-ink/48 dark:text-slate-500">
                            {provider.model}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                            provider.status === 'ready'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : provider.status === 'missing_key'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                : provider.status === 'error'
                                  ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                                  : 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
                          )}
                        >
                          {provider.status === 'ready'
                            ? 'ready'
                            : provider.status === 'missing_key'
                              ? 'missing key'
                              : provider.status === 'error'
                                ? 'error'
                                : 'disabled'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink/68 dark:text-slate-300">{provider.message}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-ink/45 dark:text-slate-500">
                        {provider.latencyMs ? `Latency ${provider.latencyMs} ms` : 'Chưa có phản hồi mẫu'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-5">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 dark:text-slate-400"
                htmlFor="settings-session-title"
              >
                Tên cuộc trò chuyện
              </label>
              {currentSession ? (
                <div className="mt-2 flex gap-2">
                  <input
                    className="focus-ring h-11 flex-1 rounded-[18px] border border-black/8 bg-white/75 px-4 text-sm outline-none dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100"
                    id="settings-session-title"
                    onChange={(event) => onDraftTitleChange(event.target.value)}
                    placeholder="Đặt tên gợi nhớ cho phiên học"
                    value={draftTitle}
                  />
                  <Button
                    className="h-11 gap-2 bg-white/80 px-4 text-ink dark:bg-slate-900/70 dark:text-white"
                    disabled={!canSaveTitle}
                    onClick={onSaveTitle}
                    type="button"
                  >
                    <Save className="h-4 w-4" />
                    Lưu
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-slate-400">
                  Chọn một cuộc trò chuyện ở sidebar để đổi tên hoặc tùy chỉnh provider cho phiên đó.
                </p>
              )}
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 dark:text-slate-400">
                Provider trả lời
              </p>
              {hasExternalProviders ? (
                <>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {providerOptions.map((provider) => (
                      <button
                        className={cn(
                          'focus-ring rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition',
                          provider === activeProvider
                            ? 'border-transparent bg-ink text-white dark:bg-white dark:text-ink'
                            : 'border-black/10 bg-white/60 text-ink/72 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300',
                        )}
                        disabled={!currentSession}
                        key={provider}
                        onClick={() => onProviderChange(provider)}
                        type="button"
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-6 text-ink/55 dark:text-slate-400">
                    {providerDescriptions[activeProvider]}
                  </p>
                </>
              ) : (
                <div className="mt-3 rounded-[22px] border border-amber-500/20 bg-amber-500/8 px-4 py-4 text-sm leading-6 text-amber-700 dark:text-amber-300">
                  <p className="font-medium">Đang dùng local fallback</p>
                  <p className="mt-2">
                    Thêm <code className="rounded bg-black/5 px-1.5 py-0.5 text-[12px] dark:bg-white/10">GEMINI_API_KEY</code> hoặc{' '}
                    <code className="rounded bg-black/5 px-1.5 py-0.5 text-[12px] dark:bg-white/10">OPENAI_API_KEY</code> vào{' '}
                    <code className="rounded bg-black/5 px-1.5 py-0.5 text-[12px] dark:bg-white/10">apps/api/.env</code> để dùng provider thật.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-2">
              <button
                className="focus-ring flex items-center justify-between rounded-[20px] border border-black/8 bg-white/70 px-4 py-3 text-left transition hover:border-black/12 dark:border-white/10 dark:bg-slate-900/55"
                onClick={onToggleTheme}
                type="button"
              >
                <div>
                  <p className="text-sm font-semibold">Giao diện</p>
                  <p className="mt-1 text-xs leading-5 text-ink/58 dark:text-slate-400">
                    Đổi giữa chế độ sáng và tối.
                  </p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 dark:border-white/10">
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </span>
              </button>

              <button
                className="focus-ring flex items-center justify-between rounded-[20px] border border-black/8 bg-white/70 px-4 py-3 text-left transition hover:border-black/12 dark:border-white/10 dark:bg-slate-900/55"
                onClick={onLogout}
                type="button"
              >
                <div>
                  <p className="text-sm font-semibold">Thoát workspace</p>
                  <p className="mt-1 text-xs leading-5 text-ink/58 dark:text-slate-400">
                    Xóa phiên đăng nhập trên thiết bị hiện tại.
                  </p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 dark:border-white/10">
                  <LogOut className="h-4 w-4" />
                </span>
              </button>
            </div>
          </section>

          <section className="mt-5 min-h-0">
            <div className="mb-4 flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/75 dark:border-white/10 dark:bg-slate-900/55">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-xl font-semibold tracking-[-0.03em]">Tài liệu gợi ý</p>
                <p className="mt-1 text-sm leading-6 text-ink/65 dark:text-slate-300">
                  Tìm theo từ khóa hoặc dựa trên ngữ cảnh của phiên học hiện tại.
                </p>
              </div>
            </div>

            <div className="min-h-0">
              <MaterialsPanel
                errorMessage={errorMessage}
                isLoading={isLoading}
                materials={materials}
                onRetry={onRetry}
                onSearchChange={onSearchChange}
                searchValue={searchValue}
              />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
