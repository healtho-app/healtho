import React from 'react';
import { MaterialIcon } from './MaterialIcon';

/**
 * IconButton — circular icon-only button. Three sizes, three variants.
 *
 * Always pass `aria-label` because there is no visible text. Without one,
 * the button is opaque to screen readers.
 *
 * Variants:
 *   ghost    slate-900 surface + hairline border. Default for app chrome.
 *   primary  brand-gradient fill with violet glow. Reserved emphasis.
 *   plain    transparent; hover surfaces a subtle slate fill. For modal
 *            close buttons and toolbar inline actions.
 */

const SIZE_CLASS = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};
const ICON_SIZE = { sm: 16, md: 20, lg: 24 };

const VARIANT_CLASS = {
  ghost: 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white',
  primary:
    'bg-brand-gradient text-white shadow-[var(--glow-primary)] hover:shadow-[var(--glow-primary-strong)]',
  plain: 'bg-transparent text-slate-400 hover:bg-slate-900 hover:text-white',
};

export function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  type = 'button',
  className = '',
  'aria-label': ariaLabel,
  ...rest
}) {
  if (import.meta.env?.DEV && !ariaLabel) {
    // eslint-disable-next-line no-console
    console.warn('[IconButton] missing required aria-label prop for icon-only button.');
  }
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={[
        'inline-flex items-center justify-center rounded-full shrink-0',
        'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'focus-visible:outline-none focus-visible:shadow-[var(--tap-ring)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      <MaterialIcon name={icon} size={ICON_SIZE[size]} />
    </button>
  );
}
