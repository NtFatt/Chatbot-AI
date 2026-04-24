import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

import { cn } from '../../utils/cn';
import { PromptStarterChips } from './PromptStarterChips';

const WELCOME_MESSAGES = {
  withSession: 'Ask a question to continue learning',
  withoutSession: 'Start a new learning session',
};

export const ThreadWelcome = ({
  hasExternalProviders,
  hasSession,
  onCreateSession,
  onPromptSelect,
}: {
  hasExternalProviders: boolean;
  hasSession: boolean;
  onCreateSession: () => void;
  onPromptSelect: (value: string) => void;
}) => {
  const [promptsExpanded, setPromptsExpanded] = useState(false);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 py-16">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean/10 text-ocean dark:bg-cyan/15 dark:text-cyan">
        <Sparkles className="h-6 w-6" />
      </div>

      <h1 className="text-center text-xl font-medium text-ink/80 dark:text-slate-200">
        {WELCOME_MESSAGES[hasSession ? 'withSession' : 'withoutSession']}
      </h1>

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

      <div className="mt-8 w-full max-w-lg">
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
            <PromptStarterChips onSelect={onPromptSelect} />
          </div>
        )}
      </div>
    </div>
  );
};
