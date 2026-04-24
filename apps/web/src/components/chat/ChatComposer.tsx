import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ImagePlus, Mic, Paperclip, Plus } from 'lucide-react';

import { MAX_MESSAGE_CHARS, type ProviderKey } from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { IconButton } from '../ui/IconButton';

interface ChatComposerProps {
  activeProvider: ProviderKey;
  connectionState: 'connected' | 'reconnecting' | 'disconnected';
  disabled: boolean;
  onChange: (value: string) => void;
  onOpenContext?: () => void;
  onSend: (message: string) => Promise<void> | void;
  value: string;
}

export const ChatComposer = ({
  connectionState,
  disabled,
  onChange,
  onOpenContext,
  onSend,
  value,
}: ChatComposerProps) => {
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const remaining = MAX_MESSAGE_CHARS - value.length;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? 'auto' : 'hidden';
  }, [value]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (isAttachOpen) {
        setIsAttachOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isAttachOpen]);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting || disabled) {
      return;
    }

    setSubmitting(true);
    try {
      await onSend(trimmed);
      onChange('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '0px';
      }
    } finally {
      setSubmitting(false);
    }
  };

  const disabledHint =
    connectionState === 'disconnected'
      ? 'Realtime disconnected. Using fallback.'
      : disabled
        ? ''
        : '';

  return (
    <div className="relative flex items-end gap-2 px-4 pb-4">
      <div
        className={cn(
          'group relative flex-1 rounded-xl border transition-colors',
          value.trim()
            ? 'border-ocean/30 bg-white/90 shadow-sm dark:border-cyan/30 dark:bg-slate-900/80'
            : 'border-black/[0.06] bg-white/80 focus-within:border-ocean/30 dark:border-white/10 dark:bg-slate-900/70 dark:focus-within:border-cyan/30',
          disabled && 'opacity-50',
        )}
      >
        <textarea
          ref={textareaRef}
          aria-label="Type your question"
          className={cn(
            'composer-scrollbar w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/35 dark:text-slate-100 dark:placeholder:text-slate-500',
            'disabled:cursor-not-allowed',
          )}
          disabled={disabled || submitting}
          maxLength={MAX_MESSAGE_CHARS}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Ask anything about your studies..."
          rows={1}
          value={value}
        />

        {remaining < 500 && (
          <div className="pointer-events-none absolute bottom-2 right-20 text-[10px] text-ink/35 dark:text-slate-600">
            {remaining}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 pb-0.5">
        <div className="relative">
          <IconButton
            className={cn(isAttachOpen && 'bg-ocean/10')}
            icon={<Plus className="h-4 w-4" />}
            onClick={(e) => {
              e.stopPropagation();
              setIsAttachOpen(!isAttachOpen);
            }}
            size="sm"
            tooltip="Attach"
            variant="ghost"
          />

          <div
            className={cn(
              'absolute bottom-full left-0 mb-2 flex gap-1 rounded-xl border border-black/[0.06] bg-white/95 p-1.5 shadow-lg backdrop-blur-xl transition-all dark:border-white/10 dark:bg-slate-900/95',
              isAttachOpen ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-2',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              className="h-8 w-8"
              icon={<Paperclip className="h-3.5 w-3.5" />}
              size="sm"
              tooltip="Attach file"
              variant="ghost"
            />
            <IconButton
              className="h-8 w-8"
              icon={<ImagePlus className="h-3.5 w-3.5" />}
              size="sm"
              tooltip="Add image"
              variant="ghost"
            />
            <IconButton
              className="h-8 w-8"
              icon={<Mic className="h-3.5 w-3.5" />}
              size="sm"
              tooltip="Voice input"
              variant="ghost"
            />
          </div>
        </div>

        {onOpenContext && (
          <IconButton
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            }
            onClick={onOpenContext}
            size="sm"
            tooltip="Learning context"
            variant="ghost"
          />
        )}

        <IconButton
          className={cn(
            'transition-all',
            value.trim() && !disabled && !submitting
              ? 'bg-ocean text-white hover:bg-ocean/90 dark:bg-cyan dark:text-ink dark:hover:bg-cyan/90'
              : 'bg-black/[0.06] text-ink/40 dark:bg-white/10 dark:text-slate-500',
          )}
          icon={<ArrowUp className="h-4 w-4" />}
          onClick={() => void submit()}
          size="sm"
          tooltip={submitting ? 'Sending...' : 'Send (Enter)'}
        />
      </div>

      {disabledHint && !disabled && (
        <p className="absolute -top-5 left-4 text-[11px] text-ink/50 dark:text-slate-500">
          {disabledHint}
        </p>
      )}
    </div>
  );
};
