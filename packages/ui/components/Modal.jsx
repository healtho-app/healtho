import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './IconButton';

/**
 * Modal — web-only centered modal. Backdrop blur, max-width 560 by default,
 * ESC-to-dismiss, click-outside-to-dismiss, body-scroll lock while open.
 *
 * Mobile uses a bottom-sheet pattern (deferred to a later phase per the
 * design-system PLATFORMS rubric).
 *
 * Renders into document.body via React portal so transforms / overflow
 * on ancestor elements don't break the centering.
 *
 * Props:
 *   open       boolean   controls visibility
 *   onClose    () => void
 *   title      string    optional, renders a header with close button
 *   maxWidth   number    default 560
 *   children   React node
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 560,
  className = '',
  closeOnBackdrop = true,
  ariaLabel,
}) {
  const dialogRef = useRef(null);

  // ESC key handler
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Initial focus: move into the dialog so keyboard users land here
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const handleBackdropClick = (e) => {
    if (!closeOnBackdrop) return;
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={!title ? ariaLabel : undefined}
        aria-labelledby={title ? 'healtho-modal-title' : undefined}
        tabIndex={-1}
        className={[
          'relative w-full rounded-2xl bg-slate-900 border border-slate-800',
          'shadow-[var(--shadow-2xl)]',
          'max-h-[calc(100vh-2rem)] overflow-y-auto',
          'focus:outline-none',
          className,
        ].join(' ')}
        style={{ maxWidth }}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <h2 id="healtho-modal-title" className="text-lg font-bold text-white font-display">
              {title}
            </h2>
            <IconButton
              icon="close"
              size="sm"
              variant="plain"
              aria-label="Close dialog"
              onClick={onClose}
            />
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
