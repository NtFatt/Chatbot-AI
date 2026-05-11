import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
    'bg-white/88 border border-black/[0.08] text-ink/72 shadow-[0_4px_14px_rgba(15,23,42,0.04)] hover:bg-white hover:text-ink hover:border-black/[0.12] active:bg-black/[0.02] dark:bg-slate-900/74 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-900/92 dark:hover:text-white dark:active:bg-slate-900/96',
  primary:
    'bg-ocean text-white border border-transparent shadow-[0_10px_20px_rgba(15,139,141,0.22)] hover:bg-ocean/92 active:bg-ocean/84 dark:bg-cyan dark:text-ink dark:hover:bg-cyan/92 dark:active:bg-cyan/84',
  ghost:
    'bg-transparent border border-transparent text-ink/58 hover:bg-black/[0.045] hover:text-ink active:bg-black/[0.06] hover:border-transparent dark:text-slate-400 dark:hover:bg-white/[0.065] dark:hover:text-white dark:active:bg-white/[0.08]',
  soft: 'bg-ocean/10 border border-ocean/12 text-ocean hover:bg-ocean/14 active:bg-ocean/18 dark:bg-cyan/15 dark:border-cyan/20 dark:text-cyan dark:hover:bg-cyan/18 dark:active:bg-cyan/24',
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-10 w-10 rounded-xl',
};

let tooltipRoot: HTMLDivElement | null = null;

function getTooltipRoot(): HTMLDivElement {
  if (!tooltipRoot) {
    tooltipRoot = document.createElement('div');
    tooltipRoot.setAttribute('id', 'icon-tooltip-root');
    tooltipRoot.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:2147483647';
    document.body.appendChild(tooltipRoot);
  }
  return tooltipRoot;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'default', size = 'md', icon, tooltip, badge, children, ...props }, ref) => {
    const localRef = useRef<HTMLButtonElement>(null);
    const mergedRef = (el: HTMLButtonElement | null) => {
      localRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
      }
    };

    const [showTooltip, setShowTooltip] = useState(false);

    const updatePosition = useCallback(() => {
      const el = localRef.current;
      if (!el) return;
      const root = getTooltipRoot();
      const rect = el.getBoundingClientRect();
      root.style.top = `${rect.top - 8}px`;
      root.style.left = `${rect.left + rect.width / 2}px`;
    }, []);

    useEffect(() => {
      if (showTooltip) {
        updatePosition();
      }
    }, [showTooltip, updatePosition]);

    useEffect(() => {
      const handleScroll = () => {
        if (showTooltip) updatePosition();
      };
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }, [showTooltip, updatePosition]);

    return (
      <>
        <button
          className={cn(
            'focus-ring group relative inline-flex shrink-0 items-center justify-center transition-all',
            'disabled:pointer-events-none disabled:opacity-40',
            variantStyles[variant],
            sizeStyles[size],
            className,
          )}
          onMouseEnter={() => tooltip && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          ref={mergedRef}
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

          {children}
        </button>

        {tooltip &&
          showTooltip &&
          createPortal(
            <div
              className="whitespace-nowrap rounded-lg border border-black/[0.06] bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-xl dark:bg-slate-100 dark:text-ink"
              style={{ transform: 'translate(-50%, -100%)' }}
            >
              {tooltip}
              <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 border-4 border-transparent border-t-ink dark:border-t-slate-100" />
            </div>,
            getTooltipRoot(),
          )}
      </>
    );
  },
);

IconButton.displayName = 'IconButton';
