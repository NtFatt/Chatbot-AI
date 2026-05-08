import { useEffect, useRef } from 'react';
import { BookOpen, FlipHorizontal, Lightbulb, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import type { ArtifactType, StudyArtifact } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { ArtifactPreview } from '../chat/ArtifactPreview';
import { IconButton } from '../ui/IconButton';

export type ArtifactBrowseMode = 'session' | 'favorites' | 'all';

const browseModes: Array<{ value: ArtifactBrowseMode; label: string }> = [
  { value: 'session', label: 'Current Session' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'all', label: 'All Artifacts' },
];

const typeFilters: { value: ArtifactType | 'all'; label: string; icon: typeof BookOpen }[] = [
  { value: 'all', label: 'All', icon: BookOpen },
  { value: 'summary', label: 'Summary', icon: BookOpen },
  { value: 'flashcard_set', label: 'Flashcards', icon: FlipHorizontal },
  { value: 'quiz_set', label: 'Quiz', icon: BookOpen },
  { value: 'note', label: 'Note', icon: Lightbulb },
];

interface ArtifactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ArtifactBrowseMode;
  onModeChange: (mode: ArtifactBrowseMode) => void;
  artifacts: StudyArtifact[];
  isLoading: boolean;
  errorMessage?: string | null;
  activeFilter: ArtifactType | 'all';
  onFilterChange: (filter: ArtifactType | 'all') => void;
  onDelete: (id: string) => void;
  onExport?: (artifact: StudyArtifact) => void;
  onShare?: (artifact: StudyArtifact) => void;
  onRevokeShare?: (artifact: StudyArtifact) => void;
  exportingArtifactId?: string | null;
  sharingArtifactId?: string | null;
  revokingArtifactId?: string | null;
  sessionCount: number;
  onStartQuizReview?: (artifact: StudyArtifact) => void;
  onToggleFavorite?: (id: string) => void;
}

export const ArtifactDrawer = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
  artifacts,
  isLoading,
  errorMessage,
  activeFilter,
  onFilterChange,
  onDelete,
  onExport,
  onShare,
  onRevokeShare,
  exportingArtifactId,
  sharingArtifactId,
  revokingArtifactId,
  sessionCount,
  onStartQuizReview,
  onToggleFavorite,
}: ArtifactDrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
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

  const filtered =
    activeFilter === 'all'
      ? artifacts
      : artifacts.filter((a) => a.type === activeFilter);

  const modeLabel =
    mode === 'session' ? 'current session artifacts' : mode === 'favorites' ? 'favorites' : 'all artifacts';
  const subtitle =
    mode === 'session'
      ? `${artifacts.length} item${artifacts.length === 1 ? '' : 's'}`
      : `${artifacts.length} item${artifacts.length === 1 ? '' : 's'}${sessionCount > 0 ? ` from ${sessionCount} session${sessionCount === 1 ? '' : 's'}` : ''}`;

  const emptyState = {
    session: {
      title: 'No artifacts in this session yet',
      body: 'Generate summaries, flashcards, or notes from responses in this thread.',
    },
    favorites: {
      title: 'No favorites yet',
      body: 'Favorite your best summaries, quizzes, or notes to revisit them across sessions.',
    },
    all: {
      title: 'No saved artifacts yet',
      body: 'Your generated summaries, notes, flashcards, and quizzes will appear here.',
    },
  } as const;

  return (
    <AnimatePresence>
      {isOpen && (
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
            ref={drawerRef}
            animate={{ x: 0 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-[440px] max-w-[94vw] flex-col overflow-hidden rounded-l-[26px] border-l border-black/[0.08] bg-[rgba(250,252,255,0.98)] shadow-[0_26px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.97)]"
            exit={{ x: '100%' }}
            initial={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">Study Artifacts</p>
                  <p className="text-xs leading-5 text-ink/62 dark:text-slate-400">
                    {subtitle}
                  </p>
                </div>
              </div>
              <IconButton icon={<X className="h-4 w-4" />} onClick={onClose} tooltip="Close" variant="ghost" />
            </div>

            <div className="space-y-3 border-b border-black/[0.06] px-5 py-3 dark:border-white/10">
              <div className="flex gap-2 overflow-x-auto">
                {browseModes.map((browseMode) => {
                  const isActive = mode === browseMode.value;
                  return (
                    <button
                      className={cn(
                        'focus-ring inline-flex shrink-0 items-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                        isActive
                          ? 'border-ocean/18 bg-ocean/10 text-ocean dark:border-cyan/20 dark:bg-cyan/15 dark:text-cyan'
                          : 'border-black/[0.08] bg-white/82 text-ink/62 hover:border-black/[0.12] hover:bg-white hover:text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white',
                      )}
                      key={browseMode.value}
                      onClick={() => onModeChange(browseMode.value)}
                      type="button"
                    >
                      {browseMode.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {typeFilters.map((filter) => {
                  const FilterIcon = filter.icon;
                  const isActive = activeFilter === filter.value;
                  const count =
                    filter.value === 'all'
                      ? artifacts.length
                      : artifacts.filter((a) => a.type === filter.value).length;

                  return (
                    <button
                      className={cn(
                        'focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                        isActive
                          ? 'border-ocean/18 bg-ocean/10 text-ocean dark:border-cyan/20 dark:bg-cyan/15 dark:text-cyan'
                          : 'border-black/[0.08] bg-white/82 text-ink/62 hover:border-black/[0.12] hover:bg-white hover:text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white',
                      )}
                      key={filter.value}
                      onClick={() => onFilterChange(filter.value)}
                      type="button"
                    >
                      <FilterIcon className="h-3 w-3" />
                      {filter.label}
                      {count > 0 && (
                        <span className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px]',
                          isActive ? 'bg-ocean/16 dark:bg-cyan/20' : 'bg-black/[0.06] dark:bg-white/10'
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      className="surface-card h-24 animate-pulse"
                      key={i}
                    />
                  ))}
                </div>
              ) : errorMessage ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-10 w-10 text-red-400/70 dark:text-red-400/60" />
                  <p className="mt-3 text-sm font-semibold text-ink/70 dark:text-slate-300">
                    Could not load {modeLabel}
                  </p>
                  <p className="mt-1 max-w-[280px] text-xs leading-5 text-ink/54 dark:text-slate-500">
                    {errorMessage}
                  </p>
                </div>
              ) : artifacts.length > 0 && filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-10 w-10 text-ink/28 dark:text-slate-600" />
                  <p className="mt-3 text-sm font-semibold text-ink/60 dark:text-slate-400">
                    No artifacts match this filter
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink/52 dark:text-slate-500">
                    Try another artifact type to browse more items in this workspace.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-10 w-10 text-ink/28 dark:text-slate-600" />
                  <p className="mt-3 text-sm font-semibold text-ink/60 dark:text-slate-400">
                    {emptyState[mode].title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink/52 dark:text-slate-500">
                    {emptyState[mode].body}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {filtered.map((artifact) => (
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        initial={{ opacity: 0, y: 8 }}
                        key={artifact.id}
                        transition={{ duration: 0.15 }}
                      >
                        <ArtifactPreview
                          artifact={artifact}
                          onDelete={onDelete}
                          onExport={onExport}
                          onRevokeShare={onRevokeShare}
                          onShare={onShare}
                          onStartQuizReview={onStartQuizReview}
                          onToggleFavorite={onToggleFavorite}
                          showSessionProvenance={mode !== 'session'}
                          isExporting={exportingArtifactId === artifact.id}
                          isRevokingShare={revokingArtifactId === artifact.id}
                          isSharing={sharingArtifactId === artifact.id}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
