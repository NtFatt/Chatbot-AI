import { Sparkles } from 'lucide-react';

import { cn } from '../../utils/cn';

export const DEFAULT_PROMPT_STARTERS = [
  'Giải thích khái niệm này theo cách dễ hiểu',
  'Cho mình một ví dụ thực tế',
  'Tóm tắt bài học thành 5 ý chính',
  'Tạo 3 câu hỏi ôn tập nhanh',
];

export const PromptStarterChips = ({
  items = DEFAULT_PROMPT_STARTERS,
  onSelect,
  compact = false,
}: {
  items?: string[];
  onSelect: (value: string) => void;
  compact?: boolean;
}) => {
  return (
    <div className={cn('flex flex-wrap gap-2', compact ? 'gap-1.5' : 'gap-2')}>
      {items.map((item) => (
        <button
          className={cn(
            'focus-ring inline-flex items-center gap-2 rounded-full border transition',
            compact
              ? 'border-black/[0.06] bg-white/82 px-3 py-1.5 text-[11px] font-medium text-ink/68 hover:border-black/10 hover:bg-white dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-300'
              : 'border-black/[0.06] bg-white/90 px-3.5 py-2 text-xs font-medium text-ink/74 hover:border-black/10 hover:bg-white dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200',
          )}
          key={item}
          onClick={() => onSelect(item)}
          type="button"
        >
          {!compact ? <Sparkles className="h-3.5 w-3.5" /> : null}
          <span>{item}</span>
        </button>
      ))}
    </div>
  );
};
