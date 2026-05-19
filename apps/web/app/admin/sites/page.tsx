'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '~/lib/api';

interface SiteRow {
  id: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  reraNumber: string | null;
  _count: { plots: number; developmentItems: number };
}

export default function SitesPage() {
  const [creating, setCreating] = useState(false);
  const sitesQ = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get<SiteRow[]>('/sites'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sites</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700"
        >
          New site
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sitesQ.data?.map((s) => (
          <Link
            key={s.id}
            href={`/admin/sites/${s.id}`}
            className="rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-500 transition"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">{s.name}</h2>
              <span className="text-xs text-slate-500 font-mono">{s.code}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {[s.city, s.state].filter(Boolean).join(', ') || '—'}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-600">
              <span>
                <strong>{s._count.plots}</strong> plots
              </span>
              <span>
                <strong>{s._count.developmentItems}</strong> dev items
              </span>
            </div>
          </Link>
        ))}
        {sitesQ.data?.length === 0 && (
          <p className="text-slate-500 text-sm col-span-full">
            No sites yet — create one to upload its CAD.
          </p>
        )}
      </div>

      {creating && <NewSiteDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewSiteDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [reraNumber, setReraNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => api.post<SiteRow>('/sites', { name, code, city, state, reraNumber }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 grid place-items-center z-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New site"
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold">New site</h2>
        <div className="space-y-3">
          <input
            placeholder="Name (e.g. Green Meadows Phase 1)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Code (e.g. GM-P1)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="City"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <input
              placeholder="State"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>
          <input
            placeholder="RERA registration no. (optional)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={reraNumber}
            onChange={(e) => setReraNumber(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border border-slate-300">
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !name || !code}
            className="text-sm px-3 py-1.5 rounded-md bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {mut.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
