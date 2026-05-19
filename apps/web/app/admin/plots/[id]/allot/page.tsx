'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '~/lib/api';

interface ShareDraft {
  fullName: string;
  email: string;
  phone: string;
  panMasked: string;
  sharePercent: number;
  nomineeName: string;
  nomineeRelation: string;
}

function emptyShare(percent = 100): ShareDraft {
  return {
    fullName: '',
    email: '',
    phone: '',
    panMasked: '',
    sharePercent: percent,
    nomineeName: '',
    nomineeRelation: '',
  };
}

export default function AllotPage() {
  const { id: plotId } = useParams<{ id: string }>();
  const router = useRouter();
  const [salePrice, setSalePrice] = useState<number>(0);
  const [shares, setShares] = useState<ShareDraft[]>([emptyShare()]);
  const [error, setError] = useState<string | null>(null);

  const plotQ = useQuery({
    queryKey: ['plot', plotId],
    queryFn: () =>
      api.get<{ plotNumber: string; site: { name: string } }>(`/plots/${plotId}`),
  });

  const total = shares.reduce((sum, s) => sum + (Number(s.sharePercent) || 0), 0);

  const mut = useMutation({
    mutationFn: () =>
      api.post(`/allotments`, {
        plotId,
        salePrice,
        shares: shares.map((s) => ({
          sharePercent: Number(s.sharePercent),
          nomineeName: s.nomineeName || undefined,
          nomineeRelation: s.nomineeRelation || undefined,
          newPerson: {
            fullName: s.fullName,
            email: s.email || undefined,
            phone: s.phone || undefined,
            panMasked: s.panMasked || undefined,
          },
        })),
      }),
    onSuccess: () => router.push(`/admin/plots/${plotId}`),
    onError: (e) => setError((e as Error).message),
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
      <div>
        <h1 className="text-2xl font-semibold">Allot plot</h1>
        <p className="text-sm text-slate-500">
          {plotQ.data?.site.name} · Plot {plotQ.data?.plotNumber}
        </p>
      </div>

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
            <h2 className="font-semibold">Owners</h2>
            <button
              onClick={() => setShares((p) => [...p, emptyShare(0)])}
              className="text-xs rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50"
            >
              + Add joint owner
            </button>
          </div>
          <div className="space-y-3">
            {shares.map((s, i) => (
              <div key={i} className="rounded-md border border-slate-200 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Full name"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={s.fullName}
                    onChange={(e) => updateShare(i, { fullName: e.target.value })}
                  />
                  <input
                    placeholder="PAN (e.g. ABCDE1234F)"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                    value={s.panMasked}
                    onChange={(e) => updateShare(i, { panMasked: e.target.value.toUpperCase() })}
                  />
                  <input
                    placeholder="Email"
                    type="email"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={s.email}
                    onChange={(e) => updateShare(i, { email: e.target.value })}
                  />
                  <input
                    placeholder="Phone"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={s.phone}
                    onChange={(e) => updateShare(i, { phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
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
                  <input
                    placeholder="Nominee name (optional)"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm mt-5"
                    value={s.nomineeName}
                    onChange={(e) => updateShare(i, { nomineeName: e.target.value })}
                  />
                  <input
                    placeholder="Nominee relation"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm mt-5"
                    value={s.nomineeRelation}
                    onChange={(e) => updateShare(i, { nomineeRelation: e.target.value })}
                  />
                </div>
                {shares.length > 1 && (
                  <button
                    onClick={() => setShares((p) => p.filter((_, j) => j !== i))}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove owner
                  </button>
                )}
              </div>
            ))}
          </div>
          <div
            className={`mt-3 text-sm ${
              Math.abs(total - 100) < 0.01 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            Shares total: <strong>{total}%</strong>{' '}
            {Math.abs(total - 100) >= 0.01 && '(must equal 100%)'}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => router.back()}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={
              mut.isPending ||
              salePrice <= 0 ||
              Math.abs(total - 100) >= 0.01 ||
              shares.some((s) => !s.fullName)
            }
            className="text-sm px-3 py-1.5 rounded-md bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {mut.isPending ? 'Allotting…' : 'Allot and generate letter'}
          </button>
        </div>
      </div>
    </div>
  );
}
