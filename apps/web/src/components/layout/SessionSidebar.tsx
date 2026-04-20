import { MessageSquareMore, Plus, Settings2, Trash2 } from 'lucide-react';

import type { ChatSessionSummary } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { formatRelativeTime, stripMarkdownPreview } from '../../utils/format';
import { Button } from '../ui/Button';

export const SessionSidebar = ({
  sessions,
  activeSessionId,
  onCreate,
  onDelete,
  onOpenSettings,
  onSelect,
}: {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  onCreate: () => void;
  onDelete: (sessionId: string) => void;
  onOpenSettings: () => void;
  onSelect: (sessionId: string) => void;
}) => {
  return (
    <aside className="glass-panel flex h-full min-h-0 flex-col overflow-hidden p-4">
      <div className="mb-4 shrink-0 flex items-center justify-between gap-3">
        <p className="font-display text-[34px] font-semibold leading-none tracking-[-0.05em]">Chat</p>
        <Button className="gap-2 px-4 py-2.5 text-sm" onClick={onCreate} type="button">
          <Plus className="h-4 w-4" />
          Mới
        </Button>
      </div>

      <div className="app-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
        {sessions.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-black/10 px-4 py-5 text-sm leading-7 text-ink/65 dark:border-white/10 dark:text-slate-400">
            Chưa có cuộc trò chuyện nào. Tạo phiên mới để bắt đầu.
          </div>
        ) : null}

        {sessions.map((session) => {
          const preview =
            stripMarkdownPreview(session.lastMessagePreview) ||
            'Chạm để mở lại cuộc trò chuyện và tiếp tục học.';

          return (
            <div
              className={cn(
                'focus-ring group w-full rounded-[22px] border px-3.5 py-3.5 text-left transition',
                activeSessionId === session.id
                  ? 'border-transparent bg-ink text-white shadow-soft dark:bg-white dark:text-ink'
                  : 'border-black/5 bg-white/70 hover:border-black/10 hover:bg-white dark:border-white/8 dark:bg-slate-900/55 dark:hover:bg-slate-900/80',
              )}
              key={session.id}
              onClick={() => onSelect(session.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(session.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MessageSquareMore className="h-3.5 w-3.5 shrink-0" />
                    <p className="truncate text-sm font-semibold">{session.title}</p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-current/68">{preview}</p>
                </div>
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em]',
                    activeSessionId === session.id ? 'border-white/20' : 'border-black/10 dark:border-white/10',
                  )}
                >
                  {session.providerPreference}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.16em] text-current/55">
                  {formatRelativeTime(session.updatedAt)}
                </p>
                <button
                  aria-label={`Xóa phiên ${session.title}`}
                  className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-current/72 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(session.id);
                  }}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 shrink-0 border-t border-black/5 pt-4 dark:border-white/10">
        <button
          className="focus-ring flex w-full items-center gap-3 rounded-[20px] border border-black/8 bg-white/72 px-3.5 py-3 text-left transition hover:border-black/12 hover:bg-white dark:border-white/10 dark:bg-slate-900/55 dark:hover:bg-slate-900/75"
          onClick={onOpenSettings}
          type="button"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
            <Settings2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Settings</p>
            <p className="mt-0.5 text-xs leading-5 text-ink/58 dark:text-slate-400">Provider, tài liệu, giao diện.</p>
          </div>
        </button>
      </div>
    </aside>
  );
};
