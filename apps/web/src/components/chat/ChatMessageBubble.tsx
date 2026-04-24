import { AlertTriangle, Copy, ListChecks, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import type { ChatMessage } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { formatRelativeTime } from '../../utils/format';
import { MarkdownContent } from './MarkdownContent';
import { MessageSources } from './MessageSources';
import { ProviderBadge } from './ProviderBadge';
import { UsageMeta } from './UsageMeta';

const statusLabelMap = {
  streaming: 'Generating...',
  sending: 'Sending...',
  needs_sync: 'Syncing...',
  failed: 'Failed',
} as const;

export const ChatMessageBubble = ({
  message,
  onPrefill,
  onRetry,
}: {
  message: ChatMessage;
  onPrefill?: (value: string) => void;
  onRetry?: (message: ChatMessage) => void;
}) => {
  const isAssistant = message.senderType === 'assistant';
  const isStreaming = message.status === 'streaming';
  const hasSources = Boolean(message.retrievalSnapshot?.materials.length);

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (!isAssistant) {
    return (
      <div className="flex w-full justify-end">
        <article
          className="max-w-[min(680px,88%)] rounded-2xl rounded-br-md bg-gradient-to-br from-ocean to-cyan px-4 py-3 text-white shadow-md"
          data-message-status={message.status}
          data-message-type={message.senderType}
          data-testid={`message-${message.clientMessageId}`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
        </article>
      </div>
    );
  }

  return (
    <div className="group relative">
      <article
        className="w-full max-w-[760px]"
        data-message-status={message.status}
        data-message-type={message.senderType}
        data-testid={`message-${message.clientMessageId}`}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/40 dark:text-slate-500">
              {formatRelativeTime(message.createdAt)}
            </span>

            {isStreaming && (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ocean dark:bg-cyan" />
                <span className="text-[11px] text-ocean/70 dark:text-cyan/70">Generating</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg text-ink/40 transition hover:bg-black/[0.04] hover:text-ink dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-white"
              onClick={() => void copyContent()}
              title="Copy"
              type="button"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {onRetry && (
              <button
                className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg text-ink/40 transition hover:bg-black/[0.04] hover:text-ink dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-white"
                onClick={() => onRetry(message)}
                title="Retry"
                type="button"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl rounded-tl-md border border-black/[0.04] bg-white/70 px-4 py-3 backdrop-blur-sm dark:border-white/8 dark:bg-slate-900/60 dark:text-slate-100">
          <MarkdownContent content={message.content || 'Analyzing and generating response...'} />

          {message.status === 'failed' && onRetry ? (
            <div className="mt-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">Generation failed</span>
              <button
                className="focus-ring inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/15 dark:text-red-400"
                onClick={() => onRetry(message)}
                type="button"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/35 dark:text-slate-600">
          {message.provider ? (
            <ProviderBadge fallbackUsed={message.fallbackUsed} model={message.model} provider={message.provider} />
          ) : null}

          {(message.latencyMs || message.totalTokens) && (
            <UsageMeta
              finishReason={message.responseFinishReason}
              latencyMs={message.latencyMs}
              totalTokens={message.totalTokens}
            />
          )}
        </div>

        {hasSources && (
          <details className="mt-2">
            <summary className="focus-ring cursor-pointer text-xs text-ink/40 transition hover:text-ink/60 dark:text-slate-500 dark:hover:text-slate-400">
              {message.retrievalSnapshot!.materials.length} source{message.retrievalSnapshot!.materials.length !== 1 ? 's' : ''} used
            </summary>
            <div className="mt-2">
              <MessageSources retrievalSnapshot={message.retrievalSnapshot!} />
            </div>
          </details>
        )}

        {onPrefill && (
          <details className="mt-2">
            <summary className="focus-ring cursor-pointer text-xs text-ink/35 transition hover:text-ink/55 dark:text-slate-600 dark:hover:text-slate-400">
              Continue learning
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-black/[0.05] bg-white/60 px-2.5 py-1.5 text-xs font-medium text-ink/70 transition hover:bg-white/80 hover:text-ink dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-white"
                onClick={() => onPrefill('Tóm tắt thành 5 ý chính ngắn gọn.')}
                type="button"
              >
                <ListChecks className="h-3 w-3" />
                Summarize
              </button>
              <button
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-black/[0.05] bg-white/60 px-2.5 py-1.5 text-xs font-medium text-ink/70 transition hover:bg-white/80 hover:text-ink dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-white"
                onClick={() => onPrefill('Tạo 5 câu hỏi ôn tập từ nội dung trên.')}
                type="button"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
                Quiz me
              </button>
              <button
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ocean/20 bg-ocean/8 px-2.5 py-1.5 text-xs font-medium text-ocean transition hover:bg-ocean/12 dark:border-cyan/20 dark:bg-cyan/10 dark:text-cyan"
                onClick={() => onPrefill('Gợi ý 3 câu hỏi follow-up để học sâu hơn.')}
                type="button"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
                Ask follow-up
              </button>
            </div>
          </details>
        )}
      </article>
    </div>
  );
};
