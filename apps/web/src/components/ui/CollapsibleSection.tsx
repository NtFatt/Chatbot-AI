import type { ReactNode } from 'react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '../../utils/cn';

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  badge?: number;
}

export const CollapsibleSection = ({
  title,
  icon,
  defaultOpen = false,
  children,
  className,
  contentClassName,
  badge,
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border-b border-black/[0.05] last:border-b-0 dark:border-white/10', className)}>
      <button
        className="focus-ring flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="flex items-center gap-2">
          {icon ? (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ocean/8 text-ocean dark:bg-cyan/10 dark:text-cyan">
              {icon}
            </span>
          ) : null}
          <span className="text-sm font-semibold text-ink dark:text-slate-100">{title}</span>
          {badge !== undefined && badge > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ocean/10 px-1.5 text-[11px] font-semibold text-ocean dark:bg-cyan/15 dark:text-cyan">
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </div>

        <ChevronDown
          className={cn(
            'h-4 w-4 text-ink/40 transition-transform duration-200 dark:text-slate-500',
            isOpen ? 'rotate-180' : '',
          )}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className={cn('px-4 pb-4', contentClassName)}>{children}</div>
      </div>
    </div>
  );
};
