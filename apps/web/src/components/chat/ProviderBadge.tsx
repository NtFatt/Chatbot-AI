import { Bot, ShieldAlert } from 'lucide-react';

import type { AiRuntimeMode, ProviderKey } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';

export const ProviderBadge = ({
  provider,
  model,
  fallbackUsed,
  aiRuntimeMode,
  learningEngineUsed,
  externalFallbackUsed,
}: {
  provider: ProviderKey;
  model?: string | null;
  fallbackUsed?: boolean;
  aiRuntimeMode?: AiRuntimeMode | null;
  learningEngineUsed?: boolean;
  externalFallbackUsed?: boolean;
}) => {
  const isInternalL3 = aiRuntimeMode === 'learning_engine_l3' && provider === 'internal_l3_tutor';
  const isLocalLora = aiRuntimeMode === 'learning_engine_l3' && provider === 'local_lora';
  const isL3ExternalFallback =
    aiRuntimeMode === 'learning_engine_l3' &&
    learningEngineUsed &&
    provider !== 'internal_l3_tutor' &&
    provider !== 'local_lora' &&
    externalFallbackUsed;
  const primaryLabel = isLocalLora
    ? 'Local LoRA Tutor'
    : isInternalL3
      ? 'AI học tập Level 3'
      : isL3ExternalFallback
        ? `L3 fallback · ${provider}`
        : provider;
  const secondaryLabel = isLocalLora ? 'L4 Runtime' : isInternalL3 ? 'L3 Tutor Model' : model;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium',
        fallbackUsed
          ? 'border-amber-500/20 bg-amber-500/[0.1] text-amber-700 dark:text-amber-300'
          : 'border-black/[0.08] bg-white/88 text-ink/74 shadow-[0_3px_10px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300',
      )}
    >
      {fallbackUsed ? <ShieldAlert className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      <span className="font-semibold">{primaryLabel}</span>
      {secondaryLabel ? <span className="text-[10px] text-current/70">{secondaryLabel}</span> : null}
      {fallbackUsed ? <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[10px]">fallback</span> : null}
    </span>
  );
};
