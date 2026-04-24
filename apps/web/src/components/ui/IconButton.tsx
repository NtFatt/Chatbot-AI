import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

import { cn } from '../../utils/cn';

type IconButtonVariant = 'default' | 'primary' | 'ghost' | 'soft';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  icon: ReactNode;
  tooltip?: string;
  badge?: number;
}

const variantStyles: Record<IconButtonVariant, string> = {
  default:
    'bg-white/80 border border-black/[0.06] text-ink/72 hover:bg-white hover:text-ink hover:border-black/[0.1] dark:bg-slate-900/70 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-900/90 dark:hover:text-white',
  primary:
    'bg-ink text-white border border-transparent hover:bg-ink/90 active:bg-ink/80 dark:bg-white dark:text-ink dark:hover:bg-white/90',
  ghost:
    'bg-transparent border border-transparent text-ink/56 hover:bg-black/[0.04] hover:text-ink hover:border-transparent dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white',
  soft: 'bg-cyan/10 border border-transparent text-ocean hover:bg-cyan/15 dark:bg-cyan/15 dark:text-cyan',
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-10 w-10 rounded-xl',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'default', size = 'md', icon, tooltip, badge, children, ...props }, ref) => {
    return (
      <button
        className={cn(
          'focus-ring group relative inline-flex shrink-0 items-center justify-center transition-all',
          'disabled:pointer-events-none disabled:opacity-40',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        ref={ref}
        title={tooltip}
        type="button"
        {...props}
      >
        <span className="inline-flex items-center justify-center">{icon}</span>

        {badge !== undefined && badge > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ocean px-1 text-[10px] font-semibold leading-none text-white dark:bg-cyan dark:text-ink">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}

        {tooltip && (
          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-black/[0.06] bg-ink px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-all group-hover:opacity-100 dark:bg-slate-100 dark:text-ink">
            {tooltip}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink dark:border-t-slate-100" />
          </span>
        )}

        {children}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
