'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '~/lib/api';

interface ShareDraft {
  fullName: string;
  email: string;
  phone: string;
  panMasked: string;
  sharePercent: number;
}

const emptyShare = (p = 100): ShareDraft => ({
  fullName: '',
  email: '',
  phone: '',
  panMasked: '',
  sharePercent: p,
});

interface Transfer {
  id: string;
  status: string;
  salePrice: string;
  createdAt: string;
  transferLetterDocId: string | null;
}

export default function TransferPage() {
  const { id: plotId } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [salePrice, setSalePrice] = useState(0);
  const [shares, setShares] = useState<ShareDraft[]>([emptyShare()]);
  const [error, setError] = useState<string | null>(null);

  const transfersQ = useQuery({
    queryKey: ['plot', plotId, 'transfers'],
    queryFn: () => api.get<Transfer[]>(`/plots/${plotId}/transfers`),
  });

  const total = shares.reduce((sum, s) => sum + (Number(s.sharePercent) || 0), 0);

  const initiate = useMutation({
    mutationFn: () =>
      api.post('/transfers', {
        plotId,
        salePrice,
        newShares: shares.map((s) => ({
          sharePercent: Number(s.sharePercent),
          newPerson: {
            fullName: s.fullName,
            email: s.email || undefined,
            phone: s.phone || undefined,
            panMasked: s.panMasked || undefined,
          },
        })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plot', plotId, 'transfers'] }),
    onError: (e) => setError((e as Error).message),
  });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) =>
      api.post(`/transfers/${id}/decision`, { decision }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plot', plotId] });
      qc.invalidateQueries({ queryKey: ['plot', plotId, 'transfers'] });
      router.push(`/admin/plots/${plotId}`);
    },
  });

  function updateShare(i: number, patch: Partial<ShareDraft>) {
    setShares((prev) => {
      const next = [...prev];
      next[i] = { ...next[i]!, ...patch };
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Initiate transfer</h1>

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
            <h2 className="font-semibold">New owner(s)</h2>
            <button
              onClick={() => setShares((p) => [...p, emptyShare(0)])}
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
              </div>
              <label className="text-xs text-slate-600 flex flex-col w-32">
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
          onClick={() => initiate.mutate()}
          disabled={
            initiate.isPending ||
            salePrice <= 0 ||
            Math.abs(total - 100) >= 0.01 ||
            shares.some((s) => !s.fullName)
          }
          className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {initiate.isPending ? 'Generating…' : 'Generate transfer letter'}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold mb-3">Existing transfers</h2>
        <ul className="space-y-2 text-sm">
          {transfersQ.data?.map((t) => (
            <li key={t.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0">
              <span>
                <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">
                  {t.status}
                </span>{' '}
                · ₹ {Number(t.salePrice).toLocaleString('en-IN')} ·{' '}
                {new Date(t.createdAt).toLocaleDateString('en-IN')}
              </span>
              {t.status === 'draft' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => decide.mutate({ id: t.id, decision: 'reject' })}
                    className="text-xs rounded-md border border-red-300 text-red-700 px-2 py-1"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => decide.mutate({ id: t.id, decision: 'approve' })}
                    className="text-xs rounded-md bg-brand-500 text-white px-2 py-1"
                  >
                    Approve
                  </button>
                </div>
              )}
            </li>
          ))}
          {transfersQ.data?.length === 0 && (
            <li className="text-slate-500">No transfers yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
