import { Bot, ShieldAlert } from 'lucide-react';

import type { ProviderKey } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';

export const ProviderBadge = ({
  provider,
  model,
  fallbackUsed,
}: {
  provider: ProviderKey;
  model?: string | null;
  fallbackUsed?: boolean;
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium',
        fallbackUsed
          ? 'border-amber-500/18 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300'
          : 'border-black/[0.08] bg-black/[0.03] text-ink/72 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300',
      )}
    >
      {fallbackUsed ? <ShieldAlert className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      <span className="font-semibold">{provider}</span>
      {model ? <span className="text-[10px] text-current/70">{model}</span> : null}
      {fallbackUsed ? <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[10px]">fallback</span> : null}
    </span>
  );
};
