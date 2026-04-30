import React, { useState, forwardRef, useId } from 'react';
import { MaterialIcon } from './MaterialIcon';

/**
 * Input — slate-900 surface with hairline border, focus ring driven by
 * the brand color. Optional leading icon (Material Symbols name) and a
 * trailing suffix (string) or arbitrary `right` slot.
 *
 * Height pulls from --input-h token (44 web, 52 mobile).
 *
 * Pass `label` to render a connected <label htmlFor={id}>; an `id`
 * is auto-generated via useId() when not supplied.
 */
export const Input = forwardRef(function Input(
  {
    label,
    icon,
    suffix,
    right,
    id: idProp,
    type = 'text',
    className = '',
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const autoId = useId();
  const id = idProp || autoId;
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-[13px] font-semibold text-slate-300 font-display"
        >
          {icon && <MaterialIcon name={icon} size={18} className="text-primary" />}
          {label}
        </label>
      )}
      <div
        className={[
          'flex items-center gap-2 rounded-xl bg-slate-900 px-4',
          'h-[var(--input-h)]',
          'border transition-all duration-200',
          focused
            ? 'border-primary shadow-[0_0_0_4px_rgba(139,92,246,0.20)]'
            : 'border-slate-800',
        ].join(' ')}
      >
        <input
          ref={ref}
          id={id}
          type={type}
          onFocus={(e) => {
            setFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            if (onBlur) onBlur(e);
          }}
          className={[
            'flex-1 min-w-0 bg-transparent border-0 outline-none',
            'text-slate-50 text-[15px] font-medium font-display',
            'placeholder:text-slate-600',
            className,
          ].join(' ')}
          {...props}
        />
        {suffix && (
          <span className="text-[13px] font-medium text-slate-500 select-none">
            {suffix}
          </span>
        )}
        {right}
      </div>
    </div>
  );
});
