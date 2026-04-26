import { useEffect, useRef } from 'react';
import { BookOpen, FlipHorizontal, Lightbulb, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import type { ArtifactType, StudyArtifact } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { ArtifactPreview } from '../chat/ArtifactPreview';
import { IconButton } from '../ui/IconButton';

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
  artifacts: StudyArtifact[];
  isLoading: boolean;
  activeFilter: ArtifactType | 'all';
  onFilterChange: (filter: ArtifactType | 'all') => void;
  onDelete: (id: string) => void;
  sessionCount: number;
}

export const ArtifactDrawer = ({
  isOpen,
  onClose,
  artifacts,
  isLoading,
  activeFilter,
  onFilterChange,
  onDelete,
  sessionCount,
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
            className="fixed bottom-0 right-0 top-0 z-50 flex w-[420px] max-w-[94vw] flex-col overflow-hidden rounded-l-2xl border-l border-black/[0.05] bg-[rgba(255,255,255,0.96)] shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.96)]"
            exit={{ x: '100%' }}
            initial={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3 dark:border-white/10">
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
                  <p className="text-xs text-ink/50 dark:text-slate-500">
                    {artifacts.length} items {sessionCount > 0 ? `from ${sessionCount} session${sessionCount !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
              </div>
              <IconButton icon={<X className="h-4 w-4" />} onClick={onClose} tooltip="Close" variant="ghost" />
            </div>

            <div className="border-b border-black/[0.05] px-4 py-2 dark:border-white/10">
              <div className="flex gap-1.5 overflow-x-auto">
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
                        'focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                        isActive
                          ? 'bg-ocean/12 text-ocean dark:bg-cyan/15 dark:text-cyan'
                          : 'text-ink/50 hover:bg-black/[0.04] hover:text-ink dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-white',
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
                          isActive ? 'bg-ocean/15 dark:bg-cyan/20' : 'bg-black/[0.06] dark:bg-white/10'
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      className="h-24 rounded-2xl border border-black/[0.05] bg-white/50 animate-pulse dark:border-white/10 dark:bg-slate-900/30"
                      key={i}
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-10 w-10 text-ink/20 dark:text-slate-700" />
                  <p className="mt-3 text-sm font-medium text-ink/50 dark:text-slate-500">
                    No artifacts yet
                  </p>
                  <p className="mt-1 text-xs text-ink/35 dark:text-slate-600">
                    Generate summaries, flashcards, or notes from AI responses
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
