import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

import { MAX_MESSAGE_CHARS } from '@chatbot-ai/shared';

import { Button } from '../ui/Button';

export const ChatComposer = ({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (message: string) => Promise<void> | void;
}) => {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const remaining = MAX_MESSAGE_CHARS - value.length;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 260)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 260 ? 'auto' : 'hidden';
  }, [value]);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting || disabled) {
      return;
    }

    setSubmitting(true);
    try {
      await onSend(trimmed);
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '0px';
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-black/8 bg-white/96 px-2.5 py-2.5 shadow-[0_18px_48px_rgba(15,23,32,0.08)] dark:border-white/10 dark:bg-[#2c2d30] dark:shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
      <div className="rounded-[20px] border border-black/6 bg-white/95 px-3.5 pt-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/10 dark:bg-[#343538]">
        <textarea
          ref={textareaRef}
          aria-label="Khung nhập câu hỏi"
          className="composer-scrollbar focus-ring min-h-[72px] max-h-[180px] w-full resize-none overflow-y-auto bg-transparent pr-2 text-[15px] leading-7 text-ink placeholder:text-ink/42 disabled:cursor-not-allowed dark:text-slate-100 dark:placeholder:text-slate-500"
          data-testid="chat-composer-input"
          disabled={disabled || submitting}
          maxLength={MAX_MESSAGE_CHARS}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Hỏi khái niệm, xin ví dụ, yêu cầu tóm tắt bài học hoặc nhờ gợi ý tài liệu..."
          value={value}
        />

        <div className="mt-3 flex flex-col gap-2 border-t border-black/6 pb-0.5 pt-2.5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-ink/60 dark:text-slate-400">
            {disabled ? 'Đang chờ phản hồi từ AI.' : 'Enter để gửi, Shift + Enter để xuống dòng.'}
          </p>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-xs font-medium text-ink/52 dark:text-slate-400">{remaining} ký tự còn lại</span>
            <Button
              aria-label="Gửi câu hỏi"
              className="h-10 min-w-[42px] rounded-full bg-gradient-to-r from-ocean to-cyan px-4 text-white shadow-[0_16px_30px_rgba(12,109,122,0.16)] dark:text-white"
              data-testid="chat-send-button"
              disabled={disabled || submitting || !value.trim()}
              onClick={() => void submit()}
              type="button"
            >
              <ArrowUp className="h-4 w-4" />
              <span className="hidden sm:inline">{submitting ? 'Đang gửi...' : 'Gửi'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
