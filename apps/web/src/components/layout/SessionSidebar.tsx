import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Archive,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Edit2,
  FlipHorizontal,
  Heart,
  Lightbulb,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Star,
  StarOff,
  Trash2,
  User,
  X,
} from 'lucide-react';

import type { ArtifactSearchResult, ArtifactType, ChatSessionSummary, GlobalSearchResult, SenderType } from '@chatbot-ai/shared';

import { useArtifactSearch } from '../../hooks/use-artifact-search';
import { useGlobalSearch } from '../../hooks/use-global-search';
import { cn } from '../../utils/cn';
import { formatRelativeTime, groupArchivedSessionsByRecency, groupSessionsByRecency, stripMarkdownPreview } from '../../utils/format';
import type { GroupedSessions } from '../../utils/format';
import { IconButton } from '../ui/IconButton';

interface SessionSidebarProps {
  sessions: ChatSessionSummary[];
  archivedSessions: ChatSessionSummary[];
  continueLearningSessions?: ChatSessionSummary[];
  activeSessionId: string | null;
  onCreate: () => void;
  onDelete: (sessionId: string) => void;
  onPin: (sessionId: string, isPinned: boolean) => void;
  onArchive: (sessionId: string) => void;
  onUnarchive: (sessionId: string) => void;
  onRename: (sessionId: string, title: string) => void;
  onOpenSettings: () => void;
  onSelect: (sessionId: string) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  totalCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  showArchived?: boolean;
  onToggleArchived?: () => void;
  onToggleArtifactFavorite?: (artifactId: string) => void;
  onBatchArchive?: (sessionIds: string[]) => Promise<void> | void;
  onBatchDelete?: (sessionIds: string[], scope: 'active' | 'archived') => Promise<void> | void;
  isBatchArchiving?: boolean;
  isBatchDeleting?: boolean;
}

interface ContextMenuState {
  sessionId: string;
  x: number;
  y: number;
}

interface SessionItemProps {
  session: ChatSessionSummary;
  isActive: boolean;
  isArchived?: boolean;
  isContinueLearning?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: (isPinned: boolean) => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onRename: (title: string) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelected?: () => void;
}

const SessionItem = ({
  session,
  isActive,
  isArchived = false,
  isContinueLearning = false,
  onSelect,
  onDelete,
  onPin,
  onArchive,
  onUnarchive,
  onRename,
  onContextMenu,
  selectionMode = false,
  isSelected = false,
  onToggleSelected,
}: SessionItemProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(session.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) {
      return;
    }
    setRenameValue(session.title);
    setIsRenaming(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleActivate = () => {
    if (isRenaming) {
      return;
    }

    if (selectionMode) {
      onToggleSelected?.();
      return;
    }

    onSelect();
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

  const isUnread = session.isUnread && !isActive;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !moreButtonRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!selectionMode) {
      return;
    }

    setMenuOpen(false);
    setIsRenaming(false);
    setRenameValue(session.title);
  }, [selectionMode, session.title]);

  return (
    <div
      className={cn(
        'group/session relative flex items-center gap-1.5 rounded-xl px-2 py-1 transition',
        selectionMode
          ? isSelected
            ? 'bg-ocean/9 text-ink shadow-[inset_0_0_0_1px_rgba(15,139,141,0.14)] dark:bg-cyan/12 dark:text-white'
            : 'text-ink/76 hover:bg-black/[0.03] hover:text-ink active:bg-black/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white dark:active:bg-white/[0.07]'
          : isActive
            ? 'bg-ocean/9 text-ink shadow-[inset_0_0_0_1px_rgba(15,139,141,0.12)] dark:bg-cyan/12 dark:text-white'
            : 'text-ink/76 hover:bg-black/[0.03] hover:text-ink active:bg-black/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white dark:active:bg-white/[0.07]',
      )}
      aria-pressed={selectionMode ? isSelected : undefined}
      data-selected={selectionMode && isSelected ? 'true' : 'false'}
      data-selection-mode={selectionMode ? 'true' : 'false'}
      data-testid={`session-item-${session.id}`}
      key={session.id}
      onClick={handleActivate}
      onContextMenu={(event) => {
        if (selectionMode) {
          event.preventDefault();
          return;
        }

        onContextMenu(event);
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleActivate();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {!selectionMode && isActive && (
        <span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-ocean dark:bg-cyan" />
      )}

      {/* Left: icon + unread dot */}
      <div className="flex shrink-0 items-center">
        {selectionMode ? (
          <span
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-md border transition',
              isSelected
                ? 'border-ocean bg-ocean text-white dark:border-cyan dark:bg-cyan dark:text-ink'
                : 'border-black/[0.12] bg-white/80 text-transparent dark:border-white/14 dark:bg-white/[0.04]',
            )}
            data-testid={`session-selection-indicator-${session.id}`}
          >
            <Check className="h-3 w-3" />
          </span>
        ) : (
          <>
            {session.isPinned && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
            {!session.isPinned && (
              <MessageSquare
                className={cn(
                  'h-3.5 w-3.5',
                  isContinueLearning && 'text-cyan-400/60 dark:text-cyan-400/40',
                  isUnread && 'text-ocean dark:text-cyan',
                )}
              />
            )}
            {isUnread && (
              <span className="absolute left-[18px] top-[10px] h-1.5 w-1.5 rounded-full bg-ocean dark:bg-cyan" />
            )}
          </>
        )}
      </div>

      {/* Center: title only — all secondary info goes into ... menu */}
      <div className="min-w-0 flex-1">
        {isRenaming ? (
          <input
            className="w-full rounded-lg border border-black/[0.08] bg-white/90 px-2 py-0.5 text-sm font-medium dark:border-white/10 dark:bg-white/[0.08]"
            onBlur={handleRenameConfirm}
            onChange={(e) => setRenameValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleRenameKeyDown}
            ref={inputRef}
            value={renameValue}
          />
        ) : (
          <span
            className="block truncate text-sm font-semibold leading-tight text-ink dark:text-slate-100"
            title={session.title}
          >
            {session.title}
          </span>
        )}
      </div>

      {/* Right: overflow menu button */}
      {!selectionMode ? (
        <button
          aria-label="More options"
          className="focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink/20 transition hover:bg-black/[0.06] hover:text-ink dark:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-white"
          data-testid={`session-menu-more-${session.id}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setMenuOpen((v) => !v);
          }}
          ref={moreButtonRef}
          title="More options"
          type="button"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {/* Overflow dropdown — absolute positioned within the session list */}
      {!selectionMode && menuOpen && (
        <div
          className="absolute right-1 top-full z-50 min-w-[148px] overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[rgba(12,18,30,0.98)]"
          data-testid={`session-menu-${session.id}`}
          ref={menuRef}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink transition hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.06]"
            data-testid={`session-menu-rename-${session.id}`}
            onClick={() => {
              setMenuOpen(false);
              onRename(session.title);
              setTimeout(() => {
                const el = document.querySelector(`[data-testid="session-item-${session.id}"]`) as HTMLElement;
                if (el) el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
              }, 0);
            }}
            type="button"
          >
            <Edit2 className="h-3 w-3 text-ink/40 dark:text-slate-500" />
            Rename
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink transition hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.06]"
            data-testid={`session-menu-pin-${session.id}`}
            onClick={() => {
              setMenuOpen(false);
              onPin(!session.isPinned);
            }}
            type="button"
          >
            {session.isPinned ? (
              <>
                <StarOff className="h-3 w-3 text-amber-500" />
                Unpin
              </>
            ) : (
              <>
                <Star className="h-3 w-3 text-amber-500" />
                Pin
              </>
            )}
          </button>
          {!isArchived ? (
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink transition hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.06]"
              data-testid={`session-menu-archive-${session.id}`}
              onClick={() => {
                setMenuOpen(false);
                onArchive?.();
              }}
              type="button"
            >
              <Archive className="h-3 w-3 text-blue-500" />
              Archive
            </button>
          ) : (
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink transition hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.06]"
              data-testid={`session-menu-unarchive-${session.id}`}
              onClick={() => {
                setMenuOpen(false);
                onUnarchive?.();
              }}
              type="button"
            >
              <ArrowLeft className="h-3 w-3 text-blue-500" />
              Restore
            </button>
          )}
          <div className="mx-2 my-0.5 border-t border-black/[0.06] dark:border-white/10" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-500 transition hover:bg-red-500/5"
            data-testid={`session-menu-delete-${session.id}`}
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            type="button"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const SelectionActionButton = ({
  icon,
  label,
  onClick,
  disabled = false,
  destructive = false,
  pending = false,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  pending?: boolean;
  testId: string;
}) => (
  <button
    className={cn(
      'focus-ring inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold transition',
      destructive
        ? 'border-red-500/18 bg-red-500/6 text-red-600 hover:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/12'
        : 'border-black/[0.08] bg-white/84 text-ink/72 hover:border-ocean/24 hover:text-ocean dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:border-cyan/20 dark:hover:text-cyan',
      'disabled:pointer-events-none disabled:opacity-45',
    )}
    data-testid={testId}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
    <span>{label}</span>
  </button>
);

const ContextMenu = ({
  state,
  session,
  onClose,
  onRename,
  onPin,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  state: ContextMenuState;
  session: ChatSessionSummary;
  onClose: () => void;
  onRename: () => void;
  onPin: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} onKeyDown={onClose} role="button" tabIndex={-1} />
      <div
        className="fixed z-40 min-w-[168px] overflow-hidden rounded-2xl border border-black/[0.08] bg-white/96 py-1.5 shadow-[0_18px_46px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[rgba(12,18,30,0.98)]"
        ref={ref}
        style={{ left: state.x, top: state.y }}
      >
        <button
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink transition hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.06]"
          onClick={() => {
            onRename();
            onClose();
          }}
          type="button"
        >
          <Edit2 className="h-3.5 w-3.5 text-ink/50 dark:text-slate-400" />
          Rename
        </button>
        <button
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink transition hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.06]"
          onClick={() => {
            onPin();
            onClose();
          }}
          type="button"
        >
          {session.isPinned ? (
            <>
              <StarOff className="h-3.5 w-3.5 text-amber-500" />
              Unpin
            </>
          ) : (
            <>
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Pin
            </>
          )}
        </button>
        {!session.isArchived ? (
          <button
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink transition hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.06]"
            onClick={() => {
              onArchive?.();
              onClose();
            }}
            type="button"
          >
            <Archive className="h-3.5 w-3.5 text-blue-500" />
            Archive
          </button>
        ) : (
          <button
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink transition hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.06]"
            onClick={() => {
              onUnarchive?.();
              onClose();
            }}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-blue-500" />
            Restore
          </button>
        )}
        <div className="mx-2 my-1 border-t border-black/[0.06] dark:border-white/10" />
        <button
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-red-500 transition hover:bg-red-500/5"
          onClick={() => {
            onDelete();
            onClose();
          }}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </>
  );
};

const SessionGroup = ({
  label,
  items,
  activeSessionId,
  isArchived,
  isPinned,
  isContinueLearning,
  onSelect,
  onDelete,
  onPin,
  onArchive,
  onUnarchive,
  onRename,
  onContextMenu,
  selectionMode = false,
  selectedSessionIds = [],
  onToggleSelected,
}: {
  label: string;
  items: ChatSessionSummary[];
  activeSessionId: string | null;
  isArchived?: boolean;
  isPinned?: boolean;
  isContinueLearning?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onContextMenu: (sessionId: string, x: number, y: number) => void;
  selectionMode?: boolean;
  selectedSessionIds?: string[];
  onToggleSelected?: (sessionId: string) => void;
}) => (
  <div key={label}>
    <p className="section-kicker px-3 py-2.5">{label}</p>
    <div className="space-y-1 px-2">
      {items.map((session) => (
        <SessionItem
          key={session.id}
          isActive={activeSessionId === session.id}
          isArchived={isArchived}
          isContinueLearning={isContinueLearning}
          onArchive={() => onArchive?.(session.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(session.id, e.clientX, e.clientY);
          }}
          onDelete={() => onDelete(session.id)}
          onPin={(pinned) => onPin(session.id, pinned)}
          onRename={(title) => onRename(session.id, title)}
          onSelect={() => onSelect(session.id)}
          onToggleSelected={() => onToggleSelected?.(session.id)}
          onUnarchive={() => onUnarchive?.(session.id)}
          isSelected={selectedSessionIds.includes(session.id)}
          selectionMode={selectionMode}
          session={session}
        />
      ))}
    </div>
  </div>
);

const SearchResultsList = ({
  results,
  isLoading,
  query,
  onSelect,
  onClose,
}: {
  results: GlobalSearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: (sessionId: string) => void;
  onClose: () => void;
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8">
        <Loader2 className="h-4 w-4 animate-spin text-ink/30 dark:text-slate-600" />
        <span className="text-xs text-ink/40 dark:text-slate-600">Searching…</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <Search className="mx-auto h-6 w-6 text-ink/20 dark:text-slate-600" />
        <p className="mt-2 text-xs text-ink/50 dark:text-slate-500">No results for &quot;{query}&quot;</p>
        <p className="mt-1 text-[10px] text-ink/30 dark:text-slate-700">Try different keywords</p>
      </div>
    );
  }

  // Group results by session
  const grouped = results.reduce<Record<string, GlobalSearchResult[]>>((acc, result) => {
    const key = result.sessionId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(result);
    return acc;
  }, {});

  return (
    <div className="space-y-1 px-2 py-1">
      {Object.entries(grouped).map(([sessionId, messages]) => {
        const first = messages[0];
        if (!first) return null;
        const sessionTitle = first.sessionTitle;
        return (
          <div key={sessionId} className="rounded-xl bg-black/[0.02] py-1 dark:bg-white/[0.03]">
            <button
              className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left transition hover:opacity-80"
              onClick={() => {
                onSelect(sessionId);
                onClose();
              }}
              type="button"
            >
              <MessageSquare className="h-3 w-3 shrink-0 text-ink/40 dark:text-slate-500" />
              <span className="truncate text-xs font-semibold text-ink dark:text-slate-200">
                {sessionTitle}
              </span>
              <span className="ml-auto shrink-0 text-[10px] text-ink/30 dark:text-slate-700">
                {messages.length} message{messages.length > 1 ? 's' : ''}
              </span>
            </button>
            <div className="space-y-px px-2">
              {messages.slice(0, 3).map((result) => {
                const SenderIcon = senderTypeIcon(result.senderType);
                return (
                  <button
                    className="group flex w-full items-start gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-black/[0.03] active:bg-black/[0.04] dark:hover:bg-white/[0.04] dark:active:bg-white/[0.06]"
                    key={result.messageId}
                    onClick={() => {
                      onSelect(result.sessionId);
                      onClose();
                    }}
                    type="button"
                  >
                    <SenderIcon className={cn('mt-0.5 h-2.5 w-2.5 shrink-0', senderTypeColor(result.senderType))} />
                    <p className="min-w-0 flex-1 line-clamp-1 text-[11px] leading-relaxed text-ink/55 dark:text-slate-500">
                      {stripMarkdownPreview(result.preview)}
                    </p>
                    <span className="shrink-0 text-[10px] text-ink/30 dark:text-slate-700">
                      {formatRelativeTime(result.createdAt)}
                    </span>
                  </button>
                );
              })}
              {messages.length > 3 && (
                <button
                  className="w-full py-1 text-center text-[10px] text-ink/30 hover:text-ocean dark:text-slate-700 dark:hover:text-cyan"
                  onClick={() => {
                    onSelect(sessionId);
                    onClose();
                  }}
                  type="button"
                >
                  +{messages.length - 3} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const senderTypeIcon = (senderType: SenderType) => {
  switch (senderType) {
    case 'user': return User;
    case 'assistant': return Sparkles;
    default: return MessageSquare;
  }
};

const senderTypeColor = (senderType: SenderType) => {
  switch (senderType) {
    case 'user': return 'text-ink/50 dark:text-slate-400';
    case 'assistant': return 'text-ocean dark:text-cyan';
    default: return 'text-ink/30 dark:text-slate-600';
  }
};

const artifactTypeIcon = (type: string) => {
  switch (type) {
    case 'summary': return BookOpen;
    case 'flashcard_set': return FlipHorizontal;
    case 'quiz_set': return BookOpen;
    case 'note': return Lightbulb;
    default: return BookOpen;
  }
};

const artifactTypeColor = (type: string) => {
  switch (type) {
    case 'summary': return 'text-ocean dark:text-cyan';
    case 'flashcard_set': return 'text-purple-600 dark:text-purple-400';
    case 'quiz_set': return 'text-amber-600 dark:text-amber-400';
    case 'note': return 'text-emerald-600 dark:text-emerald-400';
    default: return 'text-ink dark:text-slate-400';
  }
};

const ArtifactSearchResults = ({
  results,
  isLoading,
  query,
  onToggleFavorite,
}: {
  results: ArtifactSearchResult[];
  isLoading: boolean;
  query: string;
  onToggleFavorite?: (id: string) => void;
}) => {
  if (isLoading) return null;

  if (results.length === 0) return null;

  return (
    <div className="border-t border-black/[0.05] px-3 pt-1.5 dark:border-white/10">
      <p className="section-kicker py-1.5">Study Materials</p>
      <div className="space-y-px pb-1">
        {results.slice(0, 5).map((result) => {
          const TypeIcon = artifactTypeIcon(result.type);
          return (
            <div
              key={result.id}
              className="group flex items-start gap-2 rounded-lg px-2 py-2"
            >
              <TypeIcon className={cn('mt-0.5 h-3 w-3 shrink-0', artifactTypeColor(result.type))} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-ink dark:text-slate-200">
                    {result.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-ink/30 dark:text-slate-700">
                    {formatRelativeTime(result.createdAt)}
                  </span>
                </div>
                {result.sessionTitle && (
                  <p className="truncate text-[10px] text-ink/40 dark:text-slate-600">
                    {result.sessionTitle}
                  </p>
                )}
                <p className="line-clamp-1 text-[11px] leading-relaxed text-ink/50 dark:text-slate-500">
                  {result.preview}
                </p>
              </div>
              {onToggleFavorite && (
                <button
                  className={cn(
                    'focus-ring shrink-0 rounded p-1 transition',
                    result.isFavorited
                      ? 'text-red-500'
                      : 'text-ink/20 opacity-0 group-hover:opacity-100 hover:text-red-400 dark:text-slate-600',
                  )}
                  onClick={() => onToggleFavorite(result.id)}
                  title={result.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                  type="button"
                >
                  <Heart className={cn('h-3 w-3', result.isFavorited && 'fill-current')} />
                </button>
              )}
            </div>
          );
        })}
        {results.length > 5 && (
          <p className="px-2 py-1 text-center text-[10px] text-ink/30 dark:text-slate-700">
            +{results.length - 5} more artifacts
          </p>
        )}
      </div>
    </div>
  );
};

export const SessionSidebar = ({
  sessions,
  archivedSessions,
  continueLearningSessions = [],
  activeSessionId,
  onCreate,
  onDelete,
  onPin,
  onArchive,
  onUnarchive,
  onRename,
  onOpenSettings,
  onSelect,
  onLoadMore,
  isLoadingMore = false,
  hasMore = false,
  totalCount,
  isCollapsed = false,
  onToggleCollapse,
  showArchived = false,
  onToggleArchived,
  onToggleArtifactFavorite,
  onBatchArchive,
  onBatchDelete,
  isBatchArchiving = false,
  isBatchDeleting = false,
}: SessionSidebarProps) => {
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const previousShowArchivedRef = useRef(showArchived);
  const previousIsCollapsedRef = useRef(isCollapsed);

  const { data: searchResults, isLoading: isSearching } = useGlobalSearch(search);
  const { data: artifactSearchResults, isLoading: isSearchingArtifacts } = useArtifactSearch(search);
  const query = search.trim();
  const hasQuery = query.length >= 2;


  // Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleContextMenu = useCallback((sessionId: string, x: number, y: number) => {
    setContextMenu({ sessionId, x, y });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const displayedSessions = showArchived ? archivedSessions : sessions;
  const visibleSessionIds = useMemo(() => new Set(displayedSessions.map((session) => session.id)), [displayedSessions]);
  const selectedCount = selectedSessionIds.length;
  const canArchiveSelection = !showArchived && Boolean(onBatchArchive);
  const canDeleteSelection = Boolean(onBatchDelete);
  const hasSelectableSessions = displayedSessions.length > 0;
  const groupedSessions: GroupedSessions = showArchived
    ? { pinned: undefined, groups: groupArchivedSessionsByRecency(displayedSessions) }
    : groupSessionsByRecency(displayedSessions);

  // Find the session for the context menu
  const contextMenuSession = contextMenu
    ? displayedSessions.find((s) => s.id === contextMenu.sessionId)
    : null;

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedSessionIds([]);
    setContextMenu(null);
  }, []);

  const enterSelectionMode = () => {
    setSearch('');
    setContextMenu(null);
    setSelectionMode(true);
    setSelectedSessionIds([]);
  };

  const toggleSessionSelection = useCallback((sessionId: string) => {
    setSelectedSessionIds((previous) =>
      previous.includes(sessionId)
        ? previous.filter((value) => value !== sessionId)
        : [...previous, sessionId],
    );
  }, []);

  useEffect(() => {
    if (!selectionMode || !search) {
      return;
    }

    setSearch('');
  }, [selectionMode, search]);

  useEffect(() => {
    if (!selectionMode) {
      return;
    }

    setContextMenu(null);
  }, [selectionMode]);

  useEffect(() => {
    const archivedViewChanged = previousShowArchivedRef.current !== showArchived;
    const collapsedStateChanged = previousIsCollapsedRef.current !== isCollapsed;

    previousShowArchivedRef.current = showArchived;
    previousIsCollapsedRef.current = isCollapsed;

    if (!selectionMode || (!archivedViewChanged && !collapsedStateChanged)) {
      return;
    }

    exitSelectionMode();
  }, [showArchived, isCollapsed, selectionMode, exitSelectionMode]);

  useEffect(() => {
    setSelectedSessionIds((previous) => previous.filter((sessionId) => visibleSessionIds.has(sessionId)));
  }, [visibleSessionIds]);

  const handleBatchArchive = async () => {
    if (!onBatchArchive || selectedCount === 0 || isBatchArchiving || isBatchDeleting) {
      return;
    }

    try {
      await Promise.resolve(onBatchArchive(selectedSessionIds));
      exitSelectionMode();
    } catch {
      // Errors are surfaced by the parent dashboard.
    }
  };

  const handleBatchDelete = async () => {
    if (!onBatchDelete || selectedCount === 0 || isBatchDeleting || isBatchArchiving) {
      return;
    }

    const label = selectedCount === 1 ? 'session' : 'sessions';
    const confirmed = window.confirm(`Delete ${selectedCount} selected ${label}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      await Promise.resolve(onBatchDelete(selectedSessionIds, showArchived ? 'archived' : 'active'));
      exitSelectionMode();
    } catch {
      // Errors are surfaced by the parent dashboard.
    }
  };

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
        {!selectionMode ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean/10 text-ocean dark:bg-cyan/15 dark:text-cyan">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-ink dark:text-slate-100">
                {showArchived ? 'Archived' : 'Study'}
              </span>
              {totalCount !== undefined && !showArchived && (
                <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-ink/50 dark:bg-white/[0.06] dark:text-slate-500">
                  {totalCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {hasSelectableSessions ? (
                <button
                  className="focus-ring rounded-md border border-black/[0.08] bg-white/84 px-2 py-1 text-[11px] font-semibold text-ink/72 transition hover:border-ocean/24 hover:text-ocean dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:border-cyan/20 dark:hover:text-cyan"
                  data-testid="session-selection-mode-toggle"
                  onClick={enterSelectionMode}
                  type="button"
                >
                  Select
                </button>
              ) : null}
              {archivedSessions.length > 0 && (
                <button
                  className={cn(
                    'focus-ring flex h-7 w-7 items-center justify-center rounded-md transition',
                    showArchived
                      ? 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20'
                      : 'text-ink/40 hover:bg-black/[0.05] hover:text-ink dark:text-slate-500 dark:hover:bg-white/[0.06]',
                  )}
                  onClick={() => {
                    exitSelectionMode();
                    onToggleArchived?.();
                  }}
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
                  onClick={() => {
                    exitSelectionMode();
                    onToggleCollapse();
                  }}
                  size="sm"
                  tooltip="Collapse sidebar"
                />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">Select sessions</p>
              <p
                className="text-[11px] leading-5 text-ink/56 dark:text-slate-400"
                data-testid="session-selection-count"
              >
                {selectedCount} selected
              </p>
            </div>

            <div className="flex items-center gap-1">
              {canArchiveSelection ? (
                <SelectionActionButton
                  testId="session-batch-archive"
                  disabled={selectedCount === 0 || isBatchArchiving || isBatchDeleting}
                  icon={<Archive className="h-3.5 w-3.5" />}
                  label={isBatchArchiving ? 'Archiving…' : 'Archive'}
                  onClick={handleBatchArchive}
                  pending={isBatchArchiving}
                />
              ) : null}
              {canDeleteSelection ? (
                <SelectionActionButton
                  testId="session-batch-delete"
                  destructive
                  disabled={selectedCount === 0 || isBatchDeleting || isBatchArchiving}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  label={isBatchDeleting ? 'Deleting…' : 'Delete'}
                  onClick={handleBatchDelete}
                  pending={isBatchDeleting}
                />
              ) : null}
              <button
                className="focus-ring rounded-md px-2 py-1 text-[11px] font-semibold text-ink/48 transition hover:bg-black/[0.05] hover:text-ink dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
                data-testid="session-selection-clear"
                onClick={exitSelectionMode}
                type="button"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {!showArchived && (
        <div className="border-b border-black/[0.05] px-3 py-2 dark:border-white/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1.5 text-ink/30 dark:text-slate-600" />
            <input
              className="h-8 w-full rounded-xl border border-black/[0.08] bg-white/76 pl-8 pr-16 text-xs text-ink placeholder:text-ink/40 focus:border-ocean/35 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-cyan/40 dark:focus:bg-[rgba(12,18,30,1)]"
              disabled={selectionMode}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={selectionMode ? 'Exit selection mode to search…' : 'Search all sessions…'}
              ref={searchInputRef}
              type="text"
              value={selectionMode ? '' : search}
            />
            {!selectionMode && search ? (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 dark:text-slate-600 dark:hover:text-slate-400"
                onClick={() => {
                  setSearch('');
                  searchInputRef.current?.focus();
                }}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            ) : !selectionMode ? (
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden rounded border border-black/[0.06] bg-black/[0.03] px-1 py-0.5 font-mono text-[9px] text-ink/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-600 sm:block">
                ⌘K
              </kbd>
            ) : null}
          </div>
        </div>
      )}

      <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
        {showArchived && archivedSessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <Archive className="mx-auto h-8 w-8 text-ink/28 dark:text-slate-600" />
            <p className="mt-2 text-xs font-medium text-ink/60 dark:text-slate-400">No archived sessions</p>
          </div>
        ) : null}

        {!showArchived && sessions.length === 0 && !hasQuery ? (
          <div className="px-3 py-6 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-ink/28 dark:text-slate-600" />
            <p className="mt-2 text-xs font-medium text-ink/60 dark:text-slate-400">No conversations yet</p>
            <p className="mt-1 text-[11px] leading-5 text-ink/50 dark:text-slate-500">
              Ask your first question in the main workspace. Search becomes useful here once you build some study history.
            </p>
          </div>
        ) : null}

        {/* Global search results */}
        {!showArchived && !selectionMode && hasQuery ? (
          <>
            {searchResults && searchResults.items.length > 0 && (
              <p className="section-kicker px-3 pt-3 pb-1">Sessions</p>
            )}
            <SearchResultsList
              isLoading={isSearching}
              onClose={() => setSearch('')}
              onSelect={onSelect}
              query={query}
              results={searchResults?.items ?? []}
            />
            <ArtifactSearchResults
              isLoading={isSearchingArtifacts}
              onToggleFavorite={onToggleArtifactFavorite}
              query={query}
              results={artifactSearchResults?.items ?? []}
            />
          </>
        ) : null}

        {/* Continue Learning section */}
        {!showArchived && !selectionMode && !hasQuery && continueLearningSessions.length > 0 && (
          <div className="mb-1">
            <p className="section-kicker px-3 py-2">
              Tiếp tục học
            </p>
            <div className="space-y-1 px-2">
              {continueLearningSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  isActive={activeSessionId === session.id}
                  isContinueLearning={true}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleContextMenu(session.id, e.clientX, e.clientY);
                  }}
                  onDelete={() => onDelete(session.id)}
                  onPin={(pinned) => onPin(session.id, pinned)}
                  onRename={(title) => onRename(session.id, title)}
                  onSelect={() => onSelect(session.id)}
                  onToggleSelected={() => toggleSessionSelection(session.id)}
                  isSelected={selectedSessionIds.includes(session.id)}
                  selectionMode={selectionMode}
                  session={session}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pinned group (always shown first for non-archived) */}
        {!showArchived && groupedSessions.pinned && (
          <SessionGroup
            activeSessionId={activeSessionId ?? null}
            isPinned={true}
            items={groupedSessions.pinned.items}
            label={groupedSessions.pinned.label}
            onArchive={onArchive}
            onContextMenu={handleContextMenu}
            onDelete={onDelete}
            onPin={onPin}
            onRename={onRename}
            onSelect={onSelect}
            onToggleSelected={toggleSessionSelection}
            onUnarchive={onUnarchive}
            selectedSessionIds={selectedSessionIds}
            selectionMode={selectionMode}
          />
        )}

        {/* Recency groups */}
        {groupedSessions.groups.map((group) => (
          <SessionGroup
            key={group.label}
            activeSessionId={activeSessionId ?? null}
            items={group.items}
            label={group.label}
            onArchive={onArchive}
            onContextMenu={handleContextMenu}
            onDelete={onDelete}
            onPin={onPin}
            onRename={onRename}
            onSelect={onSelect}
            onToggleSelected={toggleSessionSelection}
            onUnarchive={onUnarchive}
            selectedSessionIds={selectedSessionIds}
            selectionMode={selectionMode}
          />
        ))}

        {/* Load more */}
        {!showArchived && !hasQuery && hasMore && (
          <div className="px-3 py-2">
            <button
              className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] bg-white/84 px-3 py-2.5 text-xs font-semibold text-ink/66 transition hover:border-ocean/24 hover:bg-white hover:text-ocean active:bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:border-cyan/20 dark:hover:bg-white/[0.08] dark:hover:text-cyan"
              disabled={isLoadingMore}
              onClick={() => onLoadMore?.()}
              ref={loadMoreRef}
              type="button"
            >
              {isLoadingMore ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  Loading…
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Load more
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Context menu */}
      {!selectionMode && contextMenu && contextMenuSession && (
        <ContextMenu
          onArchive={() => onArchive(contextMenu.sessionId)}
          onClose={closeContextMenu}
          onDelete={() => onDelete(contextMenu.sessionId)}
          onPin={() => onPin(contextMenu.sessionId, !contextMenuSession.isPinned)}
          onRename={() => {
            const el = document.querySelector(`[data-testid="session-item-${contextMenu.sessionId}"]`) as HTMLElement;
            if (el) {
              el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
            }
          }}
          onUnarchive={() => onUnarchive(contextMenu.sessionId)}
          session={contextMenuSession}
          state={contextMenu}
        />
      )}

      <div className="border-t border-black/[0.06] px-2 py-2.5 dark:border-white/10">
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
