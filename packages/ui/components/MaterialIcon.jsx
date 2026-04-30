import React from 'react';

/**
 * Material Symbols Outlined icon, rendered as text content inside a span.
 *
 * The icon name MUST be passed as a JSX child (text node) — never via
 * dangerouslySetInnerHTML or any other innerHTML sink. The browser looks
 * up glyphs in the Material Symbols font by ligature on the text content;
 * passing the name as text is both safe and the documented usage.
 *
 * Loaded via the same-origin <link> in apps/web/index.html and the
 * `@import` at the top of @healtho/ui/tokens.css.
 *
 * Props:
 *   name    string   icon ligature, e.g. "person", "arrow_forward"
 *   size    number   pixel size (default 24)
 *   fill    0 | 1    glyph fill axis (default 0 = outlined)
 *   weight  100..700 stroke weight axis (default 400)
 *   grade   number   contrast (default 0)
 *   className extra Tailwind classes for color, alignment, etc.
 */
export function MaterialIcon({
  name,
  size = 24,
  fill = 0,
  weight = 400,
  grade = 0,
  className = '',
  style,
  ...rest
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        'material-symbols-outlined inline-block align-middle leading-none select-none',
        className,
      ].join(' ').trim()}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' 24`,
        ...style,
      }}
      {...rest}
    >
      {name}
    </span>
  );
}
