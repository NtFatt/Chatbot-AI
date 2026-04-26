import { useRef, useState } from 'react';

import { Archive, ArrowLeft, BookOpen, Check, Edit2, FileText, GripVertical, MessageSquare, Plus, Search, Settings2, Star, StarOff, Trash2, X } from 'lucide-react';

import type { ChatSessionSummary } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { formatRelativeTime, groupArchivedSessionsByRecency, groupSessionsByRecency, stripMarkdownPreview } from '../../utils/format';
import { IconButton } from '../ui/IconButton';

interface SessionSidebarProps {
  sessions: ChatSessionSummary[];
  archivedSessions: ChatSessionSummary[];
  activeSessionId: string | null;
  onCreate: () => void;
  onDelete: (sessionId: string) => void;
  onPin: (sessionId: string, isPinned: boolean) => void;
  onArchive: (sessionId: string) => void;
  onUnarchive: (sessionId: string) => void;
  onRename: (sessionId: string, title: string) => void;
  onOpenSettings: () => void;
  onSelect: (sessionId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  showArchived?: boolean;
  onToggleArchived?: () => void;
}

interface SessionItemProps {
  session: ChatSessionSummary;
  isActive: boolean;
  isArchived?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: (isPinned: boolean) => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onRename: (title: string) => void;
}

const SessionItem = ({
  session,
  isActive,
  isArchived = false,
  onSelect,
  onDelete,
  onPin,
  onArchive,
  onUnarchive,
  onRename,
}: SessionItemProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(session.title);
    setIsRenaming(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleRenameConfirm = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenameValue(session.title);
    }
  };

  const preview = stripMarkdownPreview(session.lastMessagePreview) || 'Continue learning';
  const hasArtifacts = session.artifactCount > 0;

  return (
    <div
      className={cn(
        'group/session relative flex items-center gap-2 rounded-lg px-2 py-2 transition',
        isActive
          ? 'bg-ocean/10 text-ocean dark:bg-cyan/15 dark:text-cyan'
          : 'text-ink/70 hover:bg-black/[0.03] hover:text-ink dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white',
      )}
      data-testid={`session-item-${session.id}`}
      key={session.id}
      onClick={() => !isRenaming && onSelect()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!isRenaming) onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {isActive && (
        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-ocean dark:bg-cyan" />
      )}

      {session.isPinned && (
        <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
      )}
      {!session.isPinned && <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />}

      <div className="min-w-0 flex-1">
        {isRenaming ? (
          <input
            className="w-full rounded bg-black/[0.05] px-1.5 py-0.5 text-sm font-medium dark:bg-white/[0.08]"
            onBlur={handleRenameConfirm}
            onChange={(e) => setRenameValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleRenameKeyDown}
            ref={inputRef}
            value={renameValue}
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium leading-tight">{session.title}</p>
            {hasArtifacts && (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-ocean/10 px-1 text-[9px] font-medium text-ocean dark:bg-cyan/15 dark:text-cyan">
                {session.artifactCount}
              </span>
            )}
          </div>
        )}
        <p className="truncate text-xs text-current/50">{preview}</p>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 transition group-hover/session:opacity-100">
        {!isArchived && (
          <button
            aria-label={session.isPinned ? 'Unpin' : 'Pin'}
            className="focus-ring flex h-6 w-6 items-center justify-center rounded-md text-ink/40 transition hover:bg-amber-500/10 hover:text-amber-500 dark:text-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onPin(!session.isPinned);
            }}
            title={session.isPinned ? 'Unpin' : 'Pin'}
            type="button"
          >
            {session.isPinned ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
          </button>
        )}
        {!isArchived && (
          <button
            aria-label="Archive"
            className="focus-ring flex h-6 w-6 items-center justify-center rounded-md text-ink/40 transition hover:bg-blue-500/10 hover:text-blue-500 dark:text-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onArchive?.();
            }}
            title="Archive"
            type="button"
          >
            <Archive className="h-3 w-3" />
          </button>
        )}
        {isArchived && (
          <button
            aria-label="Unarchive"
            className="focus-ring flex h-6 w-6 items-center justify-center rounded-md text-ink/40 transition hover:bg-blue-500/10 hover:text-blue-500 dark:text-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onUnarchive?.();
            }}
            title="Restore"
            type="button"
          >
            <ArrowLeft className="h-3 w-3" />
          </button>
        )}
        <button
          aria-label={`Delete ${session.title}`}
          className="focus-ring flex h-6 w-6 items-center justify-center rounded-md text-ink/40 transition hover:bg-red-500/10 hover:text-red-500 dark:text-slate-600"
          data-testid={`delete-session-${session.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          title="Delete"
          type="button"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <span className="shrink-0 text-[10px] text-current/40">
        {formatRelativeTime(isArchived && session.archivedAt ? session.archivedAt : session.updatedAt)}
      </span>
    </div>
  );
};

const SessionGroup = ({
  label,
  items,
  activeSessionId,
  isArchived,
  onSelect,
  onDelete,
  onPin,
  onArchive,
  onUnarchive,
  onRename,
}: {
  label: string;
  items: ChatSessionSummary[];
  activeSessionId: string | null;
  isArchived?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) => (
  <div key={label}>
    <p className="section-kicker px-3 py-2">{label}</p>
    <div className="space-y-0.5 px-2">
      {items.map((session) => (
        <SessionItem
          key={session.id}
          isActive={activeSessionId === session.id}
          isArchived={isArchived}
          onArchive={() => onArchive?.(session.id)}
          onDelete={() => onDelete(session.id)}
          onPin={(pinned) => onPin(session.id, pinned)}
          onRename={(title) => onRename(session.id, title)}
          onSelect={() => onSelect(session.id)}
          onUnarchive={() => onUnarchive?.(session.id)}
          session={session}
        />
      ))}
    </div>
  </div>
);

export const SessionSidebar = ({
  sessions,
  archivedSessions,
  activeSessionId,
  onCreate,
  onDelete,
  onPin,
  onArchive,
  onUnarchive,
  onRename,
  onOpenSettings,
  onSelect,
  isCollapsed = false,
  onToggleCollapse,
  showArchived = false,
  onToggleArchived,
}: SessionSidebarProps) => {
  const [search, setSearch] = useState('');

  const filteredSessions = search.trim()
    ? sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          (s.lastMessagePreview ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : sessions;

  const displayedSessions = showArchived ? archivedSessions : filteredSessions;
  const groupedSessions = showArchived
    ? groupArchivedSessionsByRecency(displayedSessions)
    : groupSessionsByRecency(displayedSessions);

  if (isCollapsed) {
    const recentSessions = sessions.slice(0, 12);
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
          {recentSessions.map((session) => {
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
                {session.isPinned && (
                  <Star className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 fill-amber-400 text-amber-400" />
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
          <span className="text-sm font-semibold text-ink dark:text-slate-100">
            {showArchived ? 'Archived' : 'Study'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {archivedSessions.length > 0 && (
            <button
              className={cn(
                'focus-ring flex h-7 w-7 items-center justify-center rounded-md transition',
                showArchived
                  ? 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20'
                  : 'text-ink/40 hover:bg-black/[0.05] hover:text-ink dark:text-slate-500 dark:hover:bg-white/[0.06]',
              )}
              onClick={onToggleArchived}
              title={showArchived ? 'Show active sessions' : `Archived (${archivedSessions.length})`}
              type="button"
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
          )}
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

      {!showArchived && (
        <div className="border-b border-black/[0.05] px-3 py-2 dark:border-white/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/30 dark:text-slate-600" />
            <input
              className="h-7 w-full rounded-lg border border-transparent bg-black/[0.04] pl-8 pr-7 text-xs text-ink placeholder:text-ink/30 focus:border-ocean/40 focus:bg-white focus:outline-none dark:bg-white/[0.05] dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:border-cyan/40 dark:focus:bg-[rgba(12,18,30,1)]"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions..."
              type="text"
              value={search}
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 dark:text-slate-600 dark:hover:text-slate-400"
                onClick={() => setSearch('')}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
        {showArchived && archivedSessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <Archive className="mx-auto h-8 w-8 text-ink/20 dark:text-slate-600" />
            <p className="mt-2 text-xs text-ink/50 dark:text-slate-500">No archived sessions</p>
          </div>
        ) : null}

        {!showArchived && sessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-ink/20 dark:text-slate-600" />
            <p className="mt-2 text-xs text-ink/50 dark:text-slate-500">No conversations yet</p>
          </div>
        ) : null}

        {!showArchived && search && filteredSessions.length === 0 && sessions.length > 0 ? (
          <div className="px-3 py-6 text-center">
            <Search className="mx-auto h-8 w-8 text-ink/20 dark:text-slate-600" />
            <p className="mt-2 text-xs text-ink/50 dark:text-slate-500">No sessions match "{search}"</p>
          </div>
        ) : null}

        {groupedSessions.map((group) => (
          <SessionGroup
            key={group.label}
            activeSessionId={activeSessionId ?? null}
            isArchived={showArchived}
            items={group.items}
            label={group.label}
            onArchive={onArchive}
            onDelete={onDelete}
            onPin={onPin}
            onRename={onRename}
            onSelect={onSelect}
            onUnarchive={onUnarchive}
          />
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
