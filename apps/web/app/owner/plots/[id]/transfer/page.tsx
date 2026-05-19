'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '~/lib/api';

interface NewShareDraft {
  fullName: string;
  phone: string;
  panMasked: string;
  sharePercent: number;
}

export default function OwnerTransferPage() {
  const { id: plotId } = useParams<{ id: string }>();
  const router = useRouter();
  const [salePrice, setSalePrice] = useState(0);
  const [shares, setShares] = useState<NewShareDraft[]>([
    { fullName: '', phone: '', panMasked: '', sharePercent: 100 },
  ]);
  const [error, setError] = useState<string | null>(null);

  const total = shares.reduce((s, x) => s + (Number(x.sharePercent) || 0), 0);

  const mut = useMutation({
    mutationFn: () =>
      api.post('/transfers', {
        plotId,
        salePrice,
        newShares: shares.map((s) => ({
          sharePercent: Number(s.sharePercent),
          newPerson: {
            fullName: s.fullName,
            phone: s.phone || undefined,
            panMasked: s.panMasked || undefined,
          },
        })),
      }),
    onSuccess: () => router.push(`/owner/plots/${plotId}`),
    onError: (e) => setError((e as Error).message),
  });

  function updateShare(i: number, patch: Partial<NewShareDraft>) {
    setShares((p) => {
      const next = [...p];
      next[i] = { ...next[i]!, ...patch };
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Resell this plot</h1>
      <p className="text-sm text-slate-600">
        The builder reviews and approves the transfer before it takes effect. You and the new
        buyer sign the transfer letter.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <label className="block">
          <span className="text-sm text-slate-700">Sale price (₹)</span>
          <input
            type="number"
            value={salePrice || ''}
            onChange={(e) => setSalePrice(Number(e.target.value))}
            className="mt-1 block w-60 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">New buyer(s)</h2>
            <button
              onClick={() =>
                setShares((p) => [
                  ...p,
                  { fullName: '', phone: '', panMasked: '', sharePercent: 0 },
                ])
              }
              className="text-xs rounded-md border border-slate-300 px-2 py-1"
            >
              + Add joint
            </button>
          </div>
          {shares.map((s, i) => (
            <div key={i} className="rounded-md border border-slate-200 p-3 space-y-2 mb-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Full name"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={s.fullName}
                  onChange={(e) => updateShare(i, { fullName: e.target.value })}
                />
                <input
                  placeholder="PAN"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                  value={s.panMasked}
                  onChange={(e) => updateShare(i, { panMasked: e.target.value.toUpperCase() })}
                />
                <input
                  placeholder="Phone"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={s.phone}
                  onChange={(e) => updateShare(i, { phone: e.target.value })}
                />
                <label className="text-xs text-slate-600 flex flex-col">
                  Share %
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={s.sharePercent}
                    onChange={(e) =>
                      updateShare(i, { sharePercent: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <div
            className={`text-sm ${
              Math.abs(total - 100) < 0.01 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            Shares total: <strong>{total}%</strong>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={() => mut.mutate()}
          disabled={
            mut.isPending ||
            salePrice <= 0 ||
            Math.abs(total - 100) >= 0.01 ||
            shares.some((s) => !s.fullName)
          }
          className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {mut.isPending ? 'Submitting…' : 'Submit for builder approval'}
        </button>
      </div>
    </div>
  );
}
