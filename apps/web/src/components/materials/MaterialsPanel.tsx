import { AlertCircle, ArrowUpRight, BookOpenText, RefreshCcw, Search } from 'lucide-react';

import type { MaterialRecommendation } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';

const levelLabels = {
  beginner: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const;

const typeLabels = {
  pdf: 'PDF',
  video: 'Video',
  slide: 'Slide',
  article: 'Article',
  textbook: 'Book',
  exercise: 'Exercise',
} as const;

type Variant = 'default' | 'rail' | 'drawer';

export const MaterialsPanel = ({
  searchValue,
  onSearchChange,
  materials,
  isLoading,
  errorMessage,
  errorMeta,
  onRetry,
  variant = 'default',
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  materials: MaterialRecommendation[];
  isLoading: boolean;
  errorMessage?: string | null;
  errorMeta?: string | null;
  onRetry?: () => void;
  variant?: Variant;
}) => {
  const isCompact = variant === 'rail' || variant === 'drawer';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className={cn(
          'shrink-0 flex items-center gap-2 rounded-xl border',
          isCompact
            ? 'border-black/[0.05] bg-white/60 px-3 py-2.5 dark:border-white/10 dark:bg-slate-900/40'
            : 'border-black/[0.08] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-ink/35 dark:text-slate-500" />
        <input
          aria-label="Search materials"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink/35 dark:text-slate-100 dark:placeholder:text-slate-500"
          data-testid="materials-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search materials..."
          type="search"
          value={searchValue}
        />
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: isCompact ? 2 : 3 }).map((_, index) => (
            <div
              className="rounded-xl border border-black/[0.05] bg-white/50 p-3 animate-pulse dark:border-white/10 dark:bg-slate-900/30"
              key={index}
            >
              <div className="h-4 w-3/4 rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
              <div className="mt-2 h-3 w-full rounded-full bg-black/[0.04] dark:bg-white/[0.04]" />
              <div className="mt-1.5 h-3 w-2/3 rounded-full bg-black/[0.04] dark:bg-white/[0.04]" />
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="mt-3 rounded-xl border border-red-500/15 bg-red-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorMessage}</p>
              {errorMeta && (
                <p className="mt-1 text-xs text-red-500/70 dark:text-red-400/70">{errorMeta}</p>
              )}
              {onRetry && (
                <button
                  className="focus-ring mt-2 inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-500/15 dark:text-red-400"
                  onClick={onRetry}
                  type="button"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      ) : materials.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center text-center">
          <BookOpenText className="h-8 w-8 text-ink/25 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-ink/60 dark:text-slate-500">No materials found</p>
          <p className="mt-1 text-xs text-ink/40 dark:text-slate-600">
            Try different search terms
          </p>
        </div>
      ) : (
        <div className="app-scrollbar mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {materials.map((material) => (
            <a
              className={cn(
                'focus-ring group block rounded-xl border border-black/[0.05] bg-white/50 p-3 transition hover:border-black/[0.08] hover:bg-white/70 dark:border-white/10 dark:bg-slate-900/30 dark:hover:bg-slate-900/50',
                isCompact && 'p-2.5',
              )}
              data-testid={`material-${material.id}`}
              href={material.url}
              key={material.id}
              rel="noreferrer"
              target="_blank"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'font-semibold leading-tight text-ink dark:text-slate-100',
                    isCompact ? 'text-sm' : 'text-[15px]'
                  )}>
                    {material.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ocean dark:text-cyan">
                      {typeLabels[material.type]}
                    </span>
                    <span className="text-[10px] text-ink/45 dark:text-slate-600">
                      {material.subject.nameVi}
                    </span>
                    <span className="text-[10px] text-ink/35 dark:text-slate-700">
                      {Math.round(material.score)}% match
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ink/30 transition group-hover:text-ocean dark:text-slate-600 dark:group-hover:text-cyan" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
