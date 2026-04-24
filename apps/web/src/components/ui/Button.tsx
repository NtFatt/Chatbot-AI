import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  leading,
  trailing,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
}) => {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'border-transparent bg-ink text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] hover:bg-ink/92 dark:bg-white dark:text-ink dark:hover:bg-white/92',
    secondary:
      'border border-black/8 bg-white/88 text-ink hover:border-black/12 hover:bg-white dark:border-white/10 dark:bg-slate-900/65 dark:text-white dark:hover:bg-slate-900/82',
    ghost:
      'border-transparent bg-transparent text-ink/72 hover:bg-black/[0.04] hover:text-ink dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white',
    soft:
      'border border-transparent bg-cyan/10 text-ocean hover:bg-cyan/15 dark:bg-cyan/14 dark:text-cyan',
    destructive:
      'border border-red-500/15 bg-red-500/8 text-red-700 hover:bg-red-500/12 dark:text-red-300',
  };
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-9 gap-2 rounded-[14px] px-3.5 text-sm',
    md: 'h-10 gap-2 rounded-[16px] px-4 text-sm',
    lg: 'h-11 gap-2.5 rounded-[18px] px-5 text-sm',
    icon: 'h-10 w-10 rounded-full p-0',
  };

  return (
    <button
      className={cn(
        'focus-ring inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition active:translate-y-px disabled:pointer-events-none disabled:opacity-55',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {leading ? <span className="inline-flex shrink-0 items-center justify-center">{leading}</span> : null}
      {children}
      {trailing ? <span className="inline-flex shrink-0 items-center justify-center">{trailing}</span> : null}
    </button>
  );
};
