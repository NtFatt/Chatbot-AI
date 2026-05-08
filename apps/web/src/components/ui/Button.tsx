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
      'border border-transparent bg-ocean text-white shadow-[0_12px_26px_rgba(15,139,141,0.22)] hover:bg-ocean/92 active:bg-ocean/85 dark:bg-cyan dark:text-ink dark:hover:bg-cyan/92 dark:active:bg-cyan/84',
    secondary:
      'border border-black/[0.08] bg-white/92 text-ink shadow-[0_4px_14px_rgba(15,23,42,0.04)] hover:border-black/[0.12] hover:bg-white active:bg-black/[0.02] dark:border-white/10 dark:bg-slate-900/72 dark:text-white dark:hover:bg-slate-900/88 dark:active:bg-slate-900/94',
    ghost:
      'border border-transparent bg-transparent text-ink/72 hover:bg-black/[0.045] hover:text-ink active:bg-black/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.065] dark:hover:text-white dark:active:bg-white/[0.08]',
    soft:
      'border border-ocean/12 bg-ocean/10 text-ocean hover:bg-ocean/14 active:bg-ocean/18 dark:border-cyan/20 dark:bg-cyan/14 dark:text-cyan dark:hover:bg-cyan/18 dark:active:bg-cyan/24',
    destructive:
      'border border-red-500/18 bg-red-500/[0.09] text-red-700 hover:bg-red-500/[0.14] active:bg-red-500/[0.18] dark:text-red-300',
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
