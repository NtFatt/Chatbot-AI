import { BarChart3, BookOpen, CheckCircle2, Circle, Search, Sparkles, X } from 'lucide-react';

import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

type ActivationVariant = 'full' | 'compact';

const buildActivationSteps = ({
  hasCreatedSession,
  hasAskedFirstQuestion,
  hasCreatedArtifact,
}: {
  hasCreatedSession: boolean;
  hasAskedFirstQuestion: boolean;
  hasCreatedArtifact: boolean;
}) => [
  {
    done: hasCreatedSession,
    hint: hasCreatedSession ? 'Your workspace has a study thread ready.' : 'Create one or send a question to start.',
    label: 'Start a session',
  },
  {
    done: hasAskedFirstQuestion,
    hint: hasAskedFirstQuestion ? 'Your first question is already in motion.' : 'Use a starter prompt or type your own question.',
    label: 'Ask the first question',
  },
  {
    done: hasCreatedArtifact,
    hint: hasCreatedArtifact ? 'You already saved a reusable study artifact.' : 'Turn a helpful answer into a summary, flashcards, quiz, or note.',
    label: 'Save the first artifact',
  },
];

const buildNextStepCopy = ({
  hasSession,
  hasCreatedSession,
  hasAskedFirstQuestion,
  hasCreatedArtifact,
}: {
  hasSession: boolean;
  hasCreatedSession: boolean;
  hasAskedFirstQuestion: boolean;
  hasCreatedArtifact: boolean;
}) => {
  if (!hasCreatedSession) {
    return {
      body: 'Use any starter below or type directly into the composer. The workspace can create the first session as soon as you send it.',
      title: 'Start one study thread',
    };
  }

  if (!hasAskedFirstQuestion) {
    return {
      body: hasSession
        ? 'Ask one focused study question and the workspace will keep the thread title, context, and follow-up flow together.'
        : 'Send the first question to create your initial study thread and unlock the main learning loop.',
      title: 'Ask the first study question',
    };
  }

  if (!hasCreatedArtifact) {
    return {
      body: 'After a helpful answer appears, use the message actions below it to save a summary, flashcards, quiz, or note for review later.',
      title: 'Turn a good answer into an artifact',
    };
  }

  return {
    body: 'You have reached the core activation loop. Keep studying, search old threads, and revisit insights whenever you need a reset.',
    title: 'You are ready to keep going',
  };
};

export const WorkspaceActivationGuide = ({
  hasCreatedArtifact,
  hasCreatedSession,
  hasAskedFirstQuestion,
  hasSession,
  onDismiss,
  onOpenArtifacts,
  onOpenInsights,
  variant,
}: {
  hasCreatedArtifact: boolean;
  hasCreatedSession: boolean;
  hasAskedFirstQuestion: boolean;
  hasSession: boolean;
  onDismiss: () => void;
  onOpenArtifacts: () => void;
  onOpenInsights: () => void;
  variant: ActivationVariant;
}) => {
  const steps = buildActivationSteps({
    hasCreatedArtifact,
    hasCreatedSession,
    hasAskedFirstQuestion,
  });
  const nextStep = buildNextStepCopy({
    hasCreatedArtifact,
    hasCreatedSession,
    hasAskedFirstQuestion,
    hasSession,
  });

  if (variant === 'compact') {
    return (
      <section
        className="mb-4 rounded-[24px] border border-black/[0.06] bg-white/84 px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/60"
        data-testid="workspace-activation-guide"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ink/42 dark:text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-ocean dark:text-cyan" />
              <span>Activation</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">{nextStep.title}</p>
            <p className="mt-1 text-sm leading-6 text-ink/64 dark:text-slate-400">{nextStep.body}</p>
          </div>
          <button
            className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink/40 transition hover:bg-black/[0.04] hover:text-ink dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-white"
            data-testid="workspace-activation-dismiss"
            onClick={onDismiss}
            title="Dismiss onboarding"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {steps.map((step) => (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                step.done
                  ? 'border-emerald-500/18 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300'
                  : 'border-black/[0.08] bg-black/[0.03] text-ink/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400',
              )}
              key={step.label}
            >
              {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              <span>{step.label}</span>
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            data-testid="workspace-activation-open-artifacts"
            leading={<BookOpen className="h-3.5 w-3.5" />}
            onClick={onOpenArtifacts}
            size="sm"
            variant="soft"
          >
            Study Artifacts
          </Button>
          <Button
            data-testid="workspace-activation-open-insights"
            leading={<BarChart3 className="h-3.5 w-3.5" />}
            onClick={onOpenInsights}
            size="sm"
            variant="ghost"
          >
            Learning Insights
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-ink/54 dark:text-slate-400">
            <Search className="h-3.5 w-3.5" />
            Search old threads from the sidebar or press <kbd className="rounded border border-black/[0.06] bg-black/[0.03] px-1 py-0.5 font-mono text-[10px] dark:border-white/10 dark:bg-white/[0.05]">⌘K</kbd>
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-[28px] border border-black/[0.06] bg-white/86 px-5 py-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/62"
      data-testid="workspace-activation-guide"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ink/42 dark:text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-ocean dark:text-cyan" />
            <span>Get to the aha moment faster</span>
          </div>
          <p className="mt-2 text-base font-semibold text-ink dark:text-slate-100">{nextStep.title}</p>
          <p className="mt-1 text-sm leading-6 text-ink/64 dark:text-slate-400">{nextStep.body}</p>
        </div>
        <button
          className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink/40 transition hover:bg-black/[0.04] hover:text-ink dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-white"
          data-testid="workspace-activation-dismiss"
          onClick={onDismiss}
          title="Dismiss onboarding"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!hasSession ? (
        <p className="mt-3 rounded-2xl border border-dashed border-ocean/20 bg-ocean/[0.05] px-4 py-3 text-sm leading-6 text-ocean dark:border-cyan/20 dark:bg-cyan/[0.08] dark:text-cyan">
          Tip: you can press <span className="font-semibold">Enter</span> in the composer below and the workspace will create the first session automatically.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            className={cn(
              'rounded-2xl border px-3.5 py-3',
              step.done
                ? 'border-emerald-500/18 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300'
                : 'border-black/[0.08] bg-black/[0.02] text-ink/72 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300',
            )}
            key={step.label}
          >
            <div className="flex items-center gap-2">
              {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              <p className="text-sm font-semibold">{step.label}</p>
            </div>
            <p className="mt-2 text-xs leading-5 opacity-90">{step.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          className="focus-ring rounded-2xl border border-black/[0.08] bg-white/80 px-4 py-3 text-left transition hover:border-black/[0.12] hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
          data-testid="workspace-activation-open-artifacts"
          onClick={onOpenArtifacts}
          type="button"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
            <BookOpen className="h-4 w-4 text-ocean dark:text-cyan" />
            Study Artifacts
          </div>
          <p className="mt-2 text-xs leading-5 text-ink/60 dark:text-slate-400">
            Save summaries, flashcards, quizzes, and notes you want to revisit.
          </p>
        </button>

        <div className="rounded-2xl border border-black/[0.08] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
            <Search className="h-4 w-4 text-ocean dark:text-cyan" />
            Search
          </div>
          <p className="mt-2 text-xs leading-5 text-ink/60 dark:text-slate-400">
            Reopen old threads from the sidebar or press <kbd className="rounded border border-black/[0.06] bg-black/[0.03] px-1 py-0.5 font-mono text-[10px] dark:border-white/10 dark:bg-white/[0.05]">⌘K</kbd> when your study history grows.
          </p>
        </div>

        <button
          className="focus-ring rounded-2xl border border-black/[0.08] bg-white/80 px-4 py-3 text-left transition hover:border-black/[0.12] hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
          data-testid="workspace-activation-open-insights"
          onClick={onOpenInsights}
          type="button"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
            <BarChart3 className="h-4 w-4 text-ocean dark:text-cyan" />
            Learning Insights
          </div>
          <p className="mt-2 text-xs leading-5 text-ink/60 dark:text-slate-400">
            See what you have covered, which artifacts you use most, and what is worth revisiting.
          </p>
        </button>
      </div>
    </section>
  );
};
