import React from 'react';

/**
 * MealAvatar — circular avatar for meal-type rows (🍳 🥗 🍽️ 🍎) and
 * activity-level pickers (🪑 🚶 🏃 💪 🏋️). The design-system rubric
 * limits emoji to these two contexts.
 *
 * Pass exactly one of `emoji` (string) or `children` (custom node, e.g.
 * an <img> for a real photo or a MaterialIcon for an in-app fallback).
 *
 * Size scales the inner glyph proportionally. Surface, border, and
 * text color come from design tokens.
 */
export function MealAvatar({
  emoji,
  size = 40,
  variant = 'default',
  className = '',
  children,
  ...rest
}) {
  const surfaceClass =
    variant === 'gradient'
      ? 'bg-brand-gradient text-white border-0'
      : 'bg-slate-900 border border-slate-800 text-white';

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full select-none shrink-0',
        surfaceClass,
        className,
      ].join(' ')}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.5),
        lineHeight: 1,
      }}
      aria-hidden={!children}
      {...rest}
    >
      {children ?? emoji}
    </span>
  );
}
