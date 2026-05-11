import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import type { MaterialLevel } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { PromptStarterChips } from './PromptStarterChips';

const WELCOME_MESSAGES = {
  withSession: 'Ask a question to continue learning',
  withoutSession: 'Start a new learning session',
};

const WELCOME_DESCRIPTIONS = {
  withSession: 'Use one starter below or ask your own question to get the thread moving.',
  withoutSession: 'Start with one study question. Your first send can create the session automatically.',
};

const levelLabelMap: Record<MaterialLevel, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
};

const ContextChip = ({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'accent' | 'muted';
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
      tone === 'accent'
        ? 'border-ocean/15 bg-ocean/6 text-ocean dark:border-cyan/20 dark:bg-cyan/10 dark:text-cyan'
        : tone === 'muted'
          ? 'border-black/[0.05] bg-black/[0.02] text-ink/55 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300'
          : 'border-black/[0.06] bg-white/75 text-ink/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300',
    )}
  >
    <span className="text-[10px] uppercase tracking-[0.14em] text-ink/35 dark:text-slate-500">
      {label}
    </span>
    <span className="truncate">{value}</span>
  </span>
);

export const ThreadWelcome = ({
  activationContent,
  hasExternalProviders,
  hasSession,
  onCreateSession,
  onPromptSelect,
  compact = false,
  subjectLabel,
  topicLabel,
  levelLabel,
  promptItems,
  showStarterPromptsExpanded = false,
}: {
  activationContent?: ReactNode;
  hasExternalProviders: boolean;
  hasSession: boolean;
  onCreateSession: () => void;
  onPromptSelect: (value: string) => void;
  compact?: boolean;
  subjectLabel?: string | null;
  topicLabel?: string | null;
  levelLabel?: MaterialLevel | null;
  promptItems?: string[];
  showStarterPromptsExpanded?: boolean;
}) => {
  const [promptsExpanded, setPromptsExpanded] = useState(false);
  const formattedLevelLabel = levelLabel ? levelLabelMap[levelLabel] : null;
  const hasContextChips = Boolean(subjectLabel || topicLabel || formattedLevelLabel);

  useEffect(() => {
    setPromptsExpanded(showStarterPromptsExpanded);
  }, [showStarterPromptsExpanded]);

  if (compact && !hasContextChips) {
    return null;
  }

  if (compact) {
    return (
      <div className="mx-auto mb-4 w-full max-w-[760px] pt-2">
        <div className="flex flex-wrap items-center gap-2" data-testid="thread-context-chips">
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink/32 dark:text-slate-500">
            Study context
          </span>
          {subjectLabel ? <ContextChip label="Môn" value={subjectLabel} /> : null}
          {topicLabel ? <ContextChip label="Chủ đề" tone="accent" value={topicLabel} /> : null}
          {formattedLevelLabel ? (
            <ContextChip label="Mức độ" tone="muted" value={formattedLevelLabel} />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 py-16">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean/10 text-ocean dark:bg-cyan/15 dark:text-cyan">
        <Sparkles className="h-6 w-6" />
      </div>

      <h1 className="text-center text-xl font-medium text-ink/80 dark:text-slate-200">
        {WELCOME_MESSAGES[hasSession ? 'withSession' : 'withoutSession']}
      </h1>
      <p className="mt-3 max-w-xl text-center text-sm leading-6 text-ink/58 dark:text-slate-400">
        {WELCOME_DESCRIPTIONS[hasSession ? 'withSession' : 'withoutSession']}
      </p>

      {hasContextChips ? (
        <div
          className="mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2"
          data-testid="thread-context-chips"
        >
          {subjectLabel ? <ContextChip label="Môn" value={subjectLabel} /> : null}
          {topicLabel ? <ContextChip label="Chủ đề" tone="accent" value={topicLabel} /> : null}
          {formattedLevelLabel ? (
            <ContextChip label="Mức độ" tone="muted" value={formattedLevelLabel} />
          ) : null}
        </div>
      ) : null}

      {!hasExternalProviders && (
        <p className="mt-4 max-w-md text-center text-sm text-ink/50 dark:text-slate-500">
          Configure AI providers in settings for real responses
        </p>
      )}

      {!hasSession && (
        <button
          className="focus-ring mt-6 rounded-xl border border-black/[0.06] bg-white/80 px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900/90"
          onClick={onCreateSession}
          type="button"
        >
          Create first session
        </button>
      )}

      {activationContent ? (
        <div className="mt-8 w-full max-w-2xl">
          {activationContent}
        </div>
      ) : null}

      <div className={cn('w-full', activationContent ? 'mt-6 max-w-2xl' : 'mt-8 max-w-lg')}>
        {showStarterPromptsExpanded ? (
          <div
            className="rounded-[28px] border border-black/[0.06] bg-white/78 px-5 py-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/58"
            data-testid="thread-starter-prompts"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-ink/56 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-ocean dark:text-cyan" />
              <span>Starter prompts</span>
            </div>
            <p className="mt-2 text-center text-xs leading-5 text-ink/52 dark:text-slate-500">
              Pick one to fill the composer quickly, then press Enter to begin.
            </p>
            <div className="mt-4 flex justify-center">
              <PromptStarterChips items={promptItems} onSelect={onPromptSelect} />
            </div>
          </div>
        ) : (
          <>
            <button
              className="focus-ring flex w-full items-center justify-center gap-2 py-2 text-sm text-ink/50 transition hover:text-ink/70 dark:text-slate-500 dark:hover:text-slate-400"
              onClick={() => setPromptsExpanded(!promptsExpanded)}
              type="button"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Quick prompts</span>
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', promptsExpanded && 'rotate-180')}
              />
            </button>

            {promptsExpanded && (
              <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <PromptStarterChips items={promptItems} onSelect={onPromptSelect} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
