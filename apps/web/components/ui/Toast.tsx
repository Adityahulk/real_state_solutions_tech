'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface Toast {
  id: number;
  body: string;
  variant: 'info' | 'success' | 'error';
}

interface ToastCtx {
  show: (body: string, variant?: Toast['variant']) => void;
}

const Ctx = createContext<ToastCtx>({ show: () => undefined });

export function useToast(): ToastCtx {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const show = useCallback((body: string, variant: Toast['variant'] = 'info') => {
    const id = idRef.current++;
    setItems((prev) => [...prev, { id, body, variant }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 5_000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[1300] flex flex-col gap-2 max-w-sm"
        role="region"
        aria-label="Notifications"
      >
        {items.map((t) => (
          <ToastView key={t.id} toast={t} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  const colour =
    toast.variant === 'error'
      ? 'bg-red-50 border-red-200 text-red-900'
      : toast.variant === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
        : 'bg-slate-900 border-slate-800 text-white';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg shadow-md border px-4 py-2.5 text-sm ${colour}`}
    >
      {toast.body}
    </div>
  );
}
