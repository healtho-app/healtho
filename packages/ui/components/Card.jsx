import React from 'react';

/**
 * Card — slate-900 surface with hairline border. Optional decorative
 * glow blob in the top-right corner (per design system Primitives.jsx).
 *
 * Variants:
 *   default   flat hairline-bordered card.
 *   elevated  same surface + lifted card shadow from --shadow-card token.
 *
 * Padding presets sm/md/lg map to design-system spacing.
 *
 * `glow` is decorative only; rendered with aria-hidden so screen readers
 * skip it. Pointer events are disabled so it never intercepts clicks.
 */

const PADDING_CLASS = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const VARIANT_CLASS = {
  default: 'bg-slate-900 border border-slate-800',
  elevated: 'bg-slate-900 border border-slate-800 shadow-[var(--shadow-card)]',
};

export function Card({
  variant = 'default',
  padding = 'md',
  glow = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl',
        PADDING_CLASS[padding],
        VARIANT_CLASS[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {glow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/[0.08] blur-[28px]"
        />
      )}
      {children}
    </div>
  );
}
