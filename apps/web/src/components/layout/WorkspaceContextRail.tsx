import {
  ArrowUpRight,
  BookMarked,
  Bot,
  Radio,
  SearchCheck,
  Settings2,
  Sparkles,
} from 'lucide-react';

import type {
  ChatMessage,
  ChatSessionSummary,
  MaterialRecommendation,
  ProviderKey,
} from '@chatbot-ai/shared';

import { formatRelativeTime } from '../../utils/format';
import { cn } from '../../utils/cn';
import { PromptStarterChips } from '../chat/PromptStarterChips';
import { ProviderBadge } from '../chat/ProviderBadge';
import { Button } from '../ui/Button';
import { MaterialsPanel } from '../materials/MaterialsPanel';

const connectionLabels = {
  connected: 'Realtime online',
  reconnecting: 'Đang kết nối lại',
  disconnected: 'Đang dùng dự phòng',
} as const;

export const WorkspaceContextRail = ({
  activeProvider,
  connectionState,
  currentSession,
  hasExternalProviders,
  latestSourcedMessage,
  materials,
  materialsError,
  materialsErrorMeta,
  materialsLoading,
  onOpenSettings,
  onPromptSelect,
  onRetryMaterials,
  onSearchChange,
  searchValue,
  className,
}: {
  activeProvider: ProviderKey;
  connectionState: 'connected' | 'reconnecting' | 'disconnected';
  currentSession: ChatSessionSummary | null;
  hasExternalProviders: boolean;
  latestSourcedMessage: ChatMessage | null;
  materials: MaterialRecommendation[];
  materialsError?: string | null;
  materialsErrorMeta?: string | null;
  materialsLoading: boolean;
  onOpenSettings: () => void;
  onPromptSelect: (value: string) => void;
  onRetryMaterials?: () => void;
  onSearchChange: (value: string) => void;
  searchValue: string;
  className?: string;
}) => {
  const latestSources = latestSourcedMessage?.retrievalSnapshot?.materials.slice(0, 2) ?? [];

  return (
    <aside className={cn('workspace-panel h-full min-h-0 flex-col overflow-hidden', className)}>
      <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4 dark:border-white/10">
        <div>
          <p className="section-kicker">Learning Context</p>
          <p className="mt-1 text-sm text-ink/62 dark:text-slate-300">
            Tài liệu, nguồn và gợi ý học tiếp cho phiên này.
          </p>
        </div>
        <Button leading={<Settings2 className="h-4 w-4" />} onClick={onOpenSettings} size="sm" type="button" variant="secondary">
          Settings
        </Button>
      </div>

      <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <section className="rail-section">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Phiên học hiện tại</p>
              <p className="mt-2 text-lg font-semibold leading-8 text-ink dark:text-slate-50">
                {currentSession?.title ?? 'Chưa chọn cuộc trò chuyện'}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-slate-400">
                {currentSession
                  ? `Cập nhật ${formatRelativeTime(currentSession.updatedAt)}`
                  : 'Chọn một phiên chat ở sidebar để xem tài liệu, nguồn và gợi ý học tiếp.'}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/88 px-3 py-1.5 text-[11px] font-medium text-ink/66 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-300">
              <Radio className="h-3.5 w-3.5" />
              {connectionLabels[connectionState]}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ProviderBadge provider={activeProvider} />
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-black/[0.03] px-3 py-1.5 text-[11px] font-medium text-ink/62 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              <Bot className="h-3.5 w-3.5" />
              {hasExternalProviders ? 'AI thật đang sẵn sàng' : 'Đang dùng chế độ dự phòng'}
            </span>
          </div>
        </section>

        <section className="rail-section mt-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/84 dark:border-white/10 dark:bg-slate-900/55">
              <Sparkles className="h-4 w-4 text-ocean dark:text-cyan" />
            </span>
            <div>
              <p className="text-sm font-semibold">Gợi ý để học tiếp mạch hơn</p>
              <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-slate-400">
                Dùng các prompt starter để biến cuộc trò chuyện thành một phiên học có nhịp, không chỉ hỏi đáp rời rạc.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <PromptStarterChips compact onSelect={onPromptSelect} />
          </div>
        </section>

        <section className="rail-section mt-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/84 dark:border-white/10 dark:bg-slate-900/55">
              <SearchCheck className="h-4 w-4 text-ocean dark:text-cyan" />
            </span>
            <div>
              <p className="text-sm font-semibold">Nguồn gần nhất đã dùng</p>
              <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-slate-400">
                Hiển thị các tài liệu đang ảnh hưởng trực tiếp đến câu trả lời gần nhất của AI.
              </p>
            </div>
          </div>

          {latestSources.length > 0 ? (
            <div className="mt-4 space-y-3">
              {latestSources.map((source) => (
                <article
                  className="rounded-[18px] border border-black/[0.06] bg-white/85 px-3.5 py-3 dark:border-white/10 dark:bg-slate-950/40"
                  key={source.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold leading-6">{source.title}</p>
                      <p className="mt-1 text-xs leading-5 text-ink/56 dark:text-slate-400">
                        {source.subjectLabel}
                        {source.topicLabel ? ` · ${source.topicLabel}` : ''}
                        {` · độ phù hợp ${Math.round(source.score)}`}
                      </p>
                    </div>
                    <a
                      className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/10"
                      href={source.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/64 dark:text-slate-300">{source.snippet}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border border-dashed border-black/[0.08] px-4 py-5 text-sm leading-6 text-ink/58 dark:border-white/10 dark:text-slate-400">
              Chưa có nguồn nào được gắn vào câu trả lời gần đây. Khi AI dùng tài liệu để trả lời, chúng sẽ hiện ở đây.
            </div>
          )}
        </section>

        <section className="rail-section mt-4 min-h-0">
          <div className="mb-4 flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/84 dark:border-white/10 dark:bg-slate-900/55">
              <BookMarked className="h-4 w-4 text-ocean dark:text-cyan" />
            </span>
            <div>
              <p className="text-sm font-semibold">Tài liệu nên đọc tiếp</p>
              <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-slate-400">
                Vừa là recommendation panel, vừa là context rail cho phiên học hiện tại.
              </p>
            </div>
          </div>

          <MaterialsPanel
            errorMessage={materialsError}
            errorMeta={materialsErrorMeta}
            isLoading={materialsLoading}
            materials={materials}
            onRetry={onRetryMaterials}
            onSearchChange={onSearchChange}
            searchValue={searchValue}
            variant="rail"
          />
        </section>
      </div>
    </aside>
  );
};
