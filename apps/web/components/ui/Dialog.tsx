'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible modal dialog. Replaces every ad-hoc `fixed inset-0` overlay.
 *
 * Behaviour:
 *  - `role="dialog" aria-modal="true"`
 *  - On open: moves focus to the first focusable element inside.
 *  - On close (Esc, backdrop click, X): returns focus to the trigger.
 *  - Tab / Shift+Tab cycles within the dialog (focus trap).
 */

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hidden description for screen readers. */
  description?: string;
  /** Optional footer (action buttons). When provided, body and footer scroll separately. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Tailwind size token applied to max-width. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE: Record<NonNullable<Props['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  size = 'md',
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Focus the first focusable element
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(focusables);
      first?.focus();
    }, 10);
    return () => {
      clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(focusables),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] grid place-items-center bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rest-dialog-title"
        aria-describedby={description ? 'rest-dialog-desc' : undefined}
        className={`w-full ${SIZE[size]} bg-white rounded-xl shadow-xl border border-slate-200 outline-none`}
      >
        <header className="flex items-start justify-between px-5 pt-5 pb-2">
          <div>
            <h2 id="rest-dialog-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id="rest-dialog-desc" className="text-xs text-slate-500 mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-brand-500 rounded -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="px-5 pb-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <footer className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

const focusables =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
