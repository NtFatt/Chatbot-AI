import { AlertTriangle, RotateCcw } from 'lucide-react';

import type { ChatMessage, ProviderKey } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { formatRelativeTime } from '../../utils/format';
import { MarkdownContent } from './MarkdownContent';

export const ChatMessageBubble = ({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
}) => {
  const isAssistant = message.senderType === 'assistant';
  const statusLabel =
    message.status === 'streaming'
      ? 'AI đang trả lời...'
      : message.status === 'sending'
        ? 'Đang gửi câu hỏi...'
        : message.status === 'needs_sync'
          ? 'Đang đồng bộ lại...'
        : message.status === 'failed'
          ? 'Gửi thất bại'
          : null;

  return (
    <div className={cn('flex w-full', isAssistant ? 'justify-start' : 'justify-end')}>
      <article
        className={cn(
          'max-w-[min(1120px,96%)] overflow-hidden rounded-[24px] px-4 py-3.5 shadow-soft',
          isAssistant
            ? 'border border-black/6 bg-white/88 text-ink dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100'
            : 'max-w-[min(760px,82%)] bg-gradient-to-br from-cyan to-ocean text-white',
        )}
        data-message-status={message.status}
        data-message-type={message.senderType}
        data-testid={`message-${message.clientMessageId}`}
      >
        <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.17em] text-current/60">
          <span>{isAssistant ? 'Study AI' : 'You'}</span>
          <span>•</span>
          <span>{formatRelativeTime(message.createdAt)}</span>
          {message.provider ? (
            <>
              <span>•</span>
              <span>{message.provider as ProviderKey}</span>
            </>
          ) : null}
        </div>

        {isAssistant ? (
          <MarkdownContent content={message.content || 'Đang phân tích... / Thinking...'} />
        ) : (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-7">{message.content}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-current/72">
          {statusLabel ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1',
                message.status === 'failed'
                  ? 'border-red-500/20 bg-red-500/8 text-red-600 dark:text-red-300'
                  : 'border-current/12 bg-current/[0.04]',
              )}
            >
              {statusLabel}
            </span>
          ) : null}
          {message.status === 'failed' ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5" />
              {onRetry && message.senderType === 'assistant' ? (
                <button
                  className="focus-ring inline-flex items-center gap-1 rounded-full border border-current/15 px-2.5 py-1 font-medium"
                  data-testid={`retry-${message.clientMessageId}`}
                  onClick={() => onRetry(message)}
                  type="button"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Thử lại
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </article>
    </div>
  );
};
