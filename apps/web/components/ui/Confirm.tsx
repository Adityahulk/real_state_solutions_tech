'use client';

import { useCallback, useState } from 'react';
import { Dialog } from './Dialog';

interface ConfirmOpts {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface State extends ConfirmOpts {
  open: boolean;
  resolve: (ok: boolean) => void;
}

/**
 * Imperative confirm dialog — replaces `window.confirm()` calls so destructive
 * actions get an accessible, styled prompt instead of a browser modal.
 *
 * Usage:
 *
 *     const confirm = useConfirm();
 *     if (await confirm({ title: 'Delete role?', destructive: true })) {
 *       …
 *     }
 */
export function useConfirm() {
  const [, setTick] = useState(0);
  const [state, setState] = useState<State | null>(null);

  const ask = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, open: true, resolve });
      }),
    [],
  );

  const close = useCallback((ok: boolean) => {
    setState((prev) => {
      if (prev) prev.resolve(ok);
      return null;
    });
    setTick((n) => n + 1);
  }, []);

  const node = state ? (
    <Dialog
      open={state.open}
      onClose={() => close(false)}
      title={state.title}
      footer={
        <>
          <button
            type="button"
            onClick={() => close(false)}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {state.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`text-sm px-3 py-1.5 rounded-md text-white focus-visible:ring-2 ${
              state.destructive
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                : 'bg-brand-500 hover:bg-brand-700 focus-visible:ring-brand-500'
            }`}
          >
            {state.confirmLabel ?? (state.destructive ? 'Delete' : 'Confirm')}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-700">{state.body}</p>
    </Dialog>
  ) : null;

  return { ask, node };
}
