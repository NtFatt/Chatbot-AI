import { BookOpen, MessageSquare, Plus, Settings2, Trash2, X } from 'lucide-react';

import type { ChatSessionSummary } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { formatRelativeTime, groupSessionsByRecency, stripMarkdownPreview } from '../../utils/format';
import { IconButton } from '../ui/IconButton';

interface SessionSidebarProps {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  onCreate: () => void;
  onDelete: (sessionId: string) => void;
  onOpenSettings: () => void;
  onSelect: (sessionId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SessionSidebar = ({
  sessions,
  activeSessionId,
  onCreate,
  onDelete,
  onOpenSettings,
  onSelect,
  isCollapsed = false,
  onToggleCollapse,
}: SessionSidebarProps) => {
  const groupedSessions = groupSessionsByRecency(sessions);

  if (isCollapsed) {
    return (
      <aside className="flex h-full w-14 flex-col items-center border-r border-black/[0.05] py-3 dark:border-white/10">
        <div className="mb-3 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocean/10 text-ocean dark:bg-cyan/15 dark:text-cyan">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>

        <IconButton
          className="mb-4"
          icon={<Plus className="h-4 w-4" />}
          onClick={onCreate}
          size="sm"
          tooltip="New conversation"
        />

        <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
          {sessions.slice(0, 12).map((session) => {
            const isActive = activeSessionId === session.id;
            return (
              <button
                className={cn(
                  'focus-ring group relative flex h-10 w-10 items-center justify-center rounded-lg transition',
                  isActive
                    ? 'bg-ocean/15 text-ocean dark:bg-cyan/20 dark:text-cyan'
                    : 'text-ink/50 hover:bg-black/[0.04] hover:text-ink dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-white',
                )}
                key={session.id}
                onClick={() => onSelect(session.id)}
                title={session.title}
                type="button"
              >
                <MessageSquare className="h-4 w-4" />
                {isActive && (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-ocean dark:bg-cyan" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col items-center gap-1">
          <IconButton
            icon={<Settings2 className="h-4 w-4" />}
            onClick={onOpenSettings}
            size="sm"
            tooltip="Settings"
          />
          {onToggleCollapse && (
            <IconButton
              icon={<X className="h-4 w-4" />}
              onClick={onToggleCollapse}
              size="sm"
              tooltip="Expand sidebar"
            />
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/[0.05] px-3 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean/10 text-ocean dark:bg-cyan/15 dark:text-cyan">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-ink dark:text-slate-100">Study</span>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            className="h-7 w-7"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={onCreate}
            size="sm"
            tooltip="New conversation"
          />
          {onToggleCollapse && (
            <IconButton
              className="h-7 w-7"
              icon={
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              }
              onClick={onToggleCollapse}
              size="sm"
              tooltip="Collapse sidebar"
            />
          )}
        </div>
      </div>

      <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
        {sessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-ink/20 dark:text-slate-600" />
            <p className="mt-2 text-xs text-ink/50 dark:text-slate-500">No conversations yet</p>
          </div>
        ) : null}

        {groupedSessions.map((group) => (
          <div key={group.label}>
            <p className="section-kicker px-3 py-2">{group.label}</p>

            <div className="space-y-0.5 px-2">
              {group.items.map((session) => {
                const preview =
                  stripMarkdownPreview(session.lastMessagePreview) || 'Continue learning';
                const isActive = activeSessionId === session.id;

                return (
                  <div
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-lg px-2 py-2 transition',
                      isActive
                        ? 'bg-ocean/10 text-ocean dark:bg-cyan/15 dark:text-cyan'
                        : 'text-ink/70 hover:bg-black/[0.03] hover:text-ink dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white',
                    )}
                    data-testid={`session-item-${session.id}`}
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
                    {isActive && (
                      <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-ocean dark:bg-cyan" />
                    )}

                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{session.title}</p>
                      <p className="truncate text-xs text-current/50">{preview}</p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        aria-label={`Delete ${session.title}`}
                        className="focus-ring flex h-6 w-6 items-center justify-center rounded-md text-ink/40 transition hover:bg-red-500/10 hover:text-red-500 dark:text-slate-600"
                        data-testid={`delete-session-${session.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(session.id);
                        }}
                        title="Delete"
                        type="button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="shrink-0 text-[10px] text-current/40">{formatRelativeTime(session.updatedAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-black/[0.05] px-2 py-2 dark:border-white/10">
        <div className="flex items-center justify-center gap-1">
          <IconButton
            icon={<Settings2 className="h-4 w-4" />}
            onClick={onOpenSettings}
            size="sm"
            tooltip="Settings"
            variant="ghost"
          />
        </div>
      </div>
    </aside>
  );
};
