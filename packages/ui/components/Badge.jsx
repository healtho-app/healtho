import React from 'react';
import { MaterialIcon } from './MaterialIcon';

/**
 * Badge — small pill / chip with five visual variants drawn from the
 * design system's `comp-badges.html` reference.
 *
 *   gradient  brand-gradient fill, white text. Reserved for "Most Popular"
 *             style emphasis. Use sparingly.
 *   pop       soft purple tint with violet text. The "Pro" / "Now Available"
 *             default for in-app callouts.
 *   ok        soft green tint. Healthy / on-track states.
 *   warn      soft amber tint. Out-of-range / attention states.
 *   soft      slate-800 surface. Default informational chip.
 *
 * Optional leading Material Symbols icon by name.
 */

const VARIANT_CLASS = {
  gradient: 'bg-brand-gradient text-white',
  pop: 'bg-primary/[0.15] text-violet-300 border border-primary/35',
  ok: 'bg-fiber/[0.15] text-green-300 border border-fiber/30',
  warn: 'bg-carbs/[0.15] text-yellow-400 border border-carbs/30',
  soft: 'bg-slate-800 text-slate-300',
};

export function Badge({
  variant = 'soft',
  icon,
  className = '',
  children,
  ...rest
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full',
        'px-3 py-1.5 text-xs font-semibold font-display',
        VARIANT_CLASS[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {icon && <MaterialIcon name={icon} size={16} />}
      {children}
    </span>
  );
}
