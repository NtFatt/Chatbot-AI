import type { ReactNode } from 'react';
import { Gauge, ScanText, Timer } from 'lucide-react';

import type { AIFinishReason } from '@chatbot-ai/shared';

export const UsageMeta = ({
  latencyMs,
  totalTokens,
  finishReason,
}: {
  latencyMs?: number | null;
  totalTokens?: number | null;
  finishReason?: AIFinishReason | null;
}) => {
  const items = [
    latencyMs
      ? {
          label: `${latencyMs} ms`,
          icon: <Timer className="h-3.5 w-3.5" />,
        }
      : null,
    totalTokens
      ? {
          label: `${totalTokens} tokens`,
          icon: <Gauge className="h-3.5 w-3.5" />,
        }
      : null,
    finishReason && finishReason !== 'stop'
      ? {
          label: finishReason,
          icon: <ScanText className="h-3.5 w-3.5" />,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; icon: ReactNode }>;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-black/[0.03] px-2.5 py-1 text-[11px] text-current/60 dark:border-white/10 dark:bg-white/[0.04]"
          key={item.label}
        >
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  );
};
