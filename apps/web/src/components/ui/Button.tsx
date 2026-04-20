import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export const Button = ({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      className={cn(
        'focus-ring inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-60',
        'bg-ink text-white hover:bg-ink/90 active:translate-y-px dark:bg-white dark:text-ink dark:hover:bg-white/90',
        className,
      )}
      {...props}
    />
  );
};
