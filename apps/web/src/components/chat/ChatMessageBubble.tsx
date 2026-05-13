import { AlertTriangle, BookOpenText, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import type { ChatMessage } from '@chatbot-ai/shared';

import { formatRelativeTime } from '../../utils/format';
import { MarkdownContent } from './MarkdownContent';
import { MessageSources } from './MessageSources';
import { ProviderBadge } from './ProviderBadge';
import { UsageMeta } from './UsageMeta';
import { ScoreBadge } from '../ui/ScoreBadge';

export const ChatMessageBubble = ({
  message,
  onPrefill,
  onRetry,
  onGenerateArtifact,
  generatingType,
}: {
  message: ChatMessage;
  onPrefill?: (value: string) => void;
  onRetry?: (message: ChatMessage) => void;
  onGenerateArtifact?: (
    type: 'summary' | 'flashcard_set' | 'quiz_set' | 'note',
    sourceContent: string,
    messageId?: string,
  ) => Promise<void>;
  generatingType?: 'summary' | 'flashcard_set' | 'quiz_set' | 'note' | null;
}) => {
  const isAssistant = message.senderType === 'assistant';
  const isStreaming = message.status === 'streaming';
  const hasSources = Boolean(message.retrievalSnapshot?.materials.length);
  const topicLabel = message.topicLabel ?? message.subjectLabel;
  const levelLabel =
    message.levelLabel === 'beginner'
      ? 'Cơ bản'
      : message.levelLabel === 'intermediate'
        ? 'Trung bình'
        : message.levelLabel === 'advanced'
          ? 'Nâng cao'
          : null;
  const fallbackMessages = Array.from(
    new Set(message.fallbackInfo?.notices.map((notice) => notice.message).filter(Boolean) ?? []),
  );

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
            <span className="text-xs font-medium text-ink/52 dark:text-slate-400">
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
                data-testid={`retry-button-${message.clientMessageId}`}
                onClick={() => onRetry(message)}
                title="Retry"
                type="button"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl rounded-tl-md border border-black/[0.06] bg-white/82 px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] backdrop-blur-sm dark:border-white/8 dark:bg-slate-900/62 dark:text-slate-100">
          <MarkdownContent content={message.content || 'Analyzing and generating response...'} />

          {fallbackMessages.length > 0 ? (
            <div
              className="mt-3 rounded-xl border border-amber-500/22 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:border-amber-300/18 dark:bg-amber-400/10 dark:text-amber-100"
              data-testid={`fallback-warning-${message.clientMessageId}`}
            >
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Fallback status</span>
              </div>
              <div className="space-y-1">
                {fallbackMessages.map((warning) => (
                  <p key={warning} className="leading-relaxed">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {message.status === 'failed' && onRetry ? (
            <div className="mt-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">Generation failed</span>
              <button
                className="focus-ring inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/15 dark:text-red-400"
                data-testid={`retry-inline-button-${message.clientMessageId}`}
                onClick={() => onRetry(message)}
                type="button"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink/45 dark:text-slate-500">
          {message.provider ? (
            <ProviderBadge
              aiRuntimeMode={message.aiRuntimeMode}
              externalFallbackUsed={message.externalFallbackUsed}
              fallbackUsed={message.fallbackUsed}
              learningEngineUsed={message.learningEngineUsed}
              model={message.model}
              provider={message.provider}
            />
          ) : null}

          <ScoreBadge kind="confidence" score={message.confidenceScore} />

          {topicLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-white/82 px-2.5 py-0.5 text-[11px] font-medium text-ink/64 shadow-[0_3px_10px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              {topicLabel}
              {levelLabel ? <span className="text-ink/35 dark:text-slate-500">· {levelLabel}</span> : null}
            </span>
          ) : null}

          {hasSources && (
            <span className="inline-flex items-center gap-1 rounded-full border border-ocean/20 bg-ocean/10 px-2.5 py-0.5 text-[11px] font-semibold text-ocean dark:border-cyan/20 dark:bg-cyan/12 dark:text-cyan">
              <BookOpenText className="h-3 w-3" />
              {message.retrievalSnapshot!.materials.length} nguồn
            </span>
          )}

          {(message.latencyMs || message.totalTokens) && (
            <UsageMeta
              finishReason={message.responseFinishReason}
              latencyMs={message.latencyMs}
              totalTokens={message.totalTokens}
            />
          )}
        </div>

        {hasSources && (
          <div className="mt-2">
            <MessageSources retrievalSnapshot={message.retrievalSnapshot!} />
          </div>
        )}

        {(onPrefill || onGenerateArtifact) && message.senderType === 'assistant' && message.status === 'sent' && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {onGenerateArtifact && message.content.length > 50 && (
              <>
                <button
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-ocean/20 bg-ocean/10 px-3 py-1.5 text-xs font-semibold text-ocean transition hover:bg-ocean/14 active:bg-ocean/18 dark:border-cyan/20 dark:bg-cyan/12 dark:text-cyan disabled:opacity-50"
                  onClick={() => onGenerateArtifact('summary', message.content, message.id)}
                  disabled={generatingType !== null}
                  type="button"
                >
                  Tóm tắt
                </button>
                <button
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-500/14 active:bg-purple-500/18 dark:border-purple-400/20 dark:bg-purple-400/12 dark:text-purple-300 disabled:opacity-50"
                  onClick={() => onGenerateArtifact('flashcard_set', message.content, message.id)}
                  disabled={generatingType !== null}
                  type="button"
                >
                  Flashcard
                </button>
                <button
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-amber-500/22 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/14 active:bg-amber-500/18 dark:border-amber-400/20 dark:bg-amber-400/12 dark:text-amber-300 disabled:opacity-50"
                  onClick={() => onGenerateArtifact('quiz_set', message.content, message.id)}
                  disabled={generatingType !== null}
                  type="button"
                >
                  Quiz
                </button>
                <button
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/22 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/14 active:bg-emerald-500/18 dark:border-emerald-400/20 dark:bg-emerald-400/12 dark:text-emerald-300 disabled:opacity-50"
                  onClick={() => onGenerateArtifact('note', message.content, message.id)}
                  disabled={generatingType !== null}
                  type="button"
                >
                  Ghi chú
                </button>
              </>
            )}
            {onPrefill && (
              <button
                className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white/84 px-3 py-1.5 text-xs font-semibold text-ink/72 transition hover:border-black/[0.12] hover:bg-white hover:text-ink active:bg-black/[0.02] dark:border-white/10 dark:bg-slate-900/56 dark:text-slate-300 dark:hover:bg-slate-900/74 dark:hover:text-white"
                onClick={() => onPrefill('Gợi ý 3 câu hỏi follow-up để học sâu hơn.')}
                type="button"
              >
                Ask follow-up
              </button>
            )}
          </div>
        )}
      </article>
    </div>
  );
};
