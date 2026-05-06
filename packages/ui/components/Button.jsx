import React from 'react';

/**
 * Button — three variants × three sizes, fully round, with the brand
 * focus ring and the design-system token-driven height.
 *
 * Sizes pull from --btn-h-sm/md/lg tokens, which differ by platform:
 *   web      sm 36 / md 44 / lg 52
 *   mobile   sm 40 / md 48 / lg 56  (data-platform="mobile" on a parent)
 *
 * Variants:
 *   primary    brand gradient + soft violet shadow. Default CTA.
 *   secondary  slate-900 surface + hairline border. Quiet alternative.
 *   ghost      transparent + 1.5px white-translucent border. Lowest emphasis.
 *
 * Pass `as="a"` (or any tag) to render a link styled as a button.
 */

const SIZE_CLASS = {
  sm: 'h-[var(--btn-h-sm)] px-4 text-sm gap-1.5',
  md: 'h-[var(--btn-h-md)] px-6 text-[15px] gap-2',
  lg: 'h-[var(--btn-h-lg)] px-8 text-base gap-2',
};

const VARIANT_CLASS = {
  primary: [
    'bg-brand-gradient text-white',
    'shadow-[0_10px_25px_-5px_rgba(139,92,246,0.35)]',
    'hover:shadow-[0_18px_40px_-10px_rgba(139,92,246,0.45)]',
  ].join(' '),
  secondary: [
    'bg-slate-900 text-white border border-slate-800',
    'hover:bg-slate-800 hover:border-slate-700',
  ].join(' '),
  ghost: [
    'bg-white/[0.06] text-white border border-white/40',
    'hover:bg-white/[0.12] hover:border-white/60',
  ].join(' '),
};

export function Button({
  variant = 'primary',
  size = 'md',
  as: Tag = 'button',
  type,
  className = '',
  children,
  disabled,
  ...rest
}) {
  const isButton = Tag === 'button';
  return (
    <Tag
      type={isButton ? (type || 'button') : type}
      disabled={isButton ? disabled : undefined}
      aria-disabled={!isButton && disabled ? 'true' : undefined}
      className={[
        'inline-flex items-center justify-center rounded-full font-display font-semibold',
        'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'focus-visible:outline-none focus-visible:shadow-[var(--tap-ring)]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
