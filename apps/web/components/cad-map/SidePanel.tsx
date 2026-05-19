'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Animated right-rail side panel that slides over the map. Backdrop-free so
 * the map remains interactive; the user can keep clicking other plots without
 * dismissing.
 */
export function SidePanel({ open, onClose, children }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <aside
      className={`absolute top-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-slate-200 shadow-xl z-[1100]
        transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      aria-hidden={!open}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-900 z-10"
        aria-label="Close panel"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="h-full overflow-y-auto">{children}</div>
    </aside>
  );
}
