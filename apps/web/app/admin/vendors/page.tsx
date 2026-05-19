'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '~/lib/api';

interface VendorRow {
  id: string;
  name: string;
  gstin: string | null;
  pan: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  scope: string | null;
  _count: { workPackages: number };
}

export default function VendorsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get<VendorRow[]>('/vendors'),
  });
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vendors</h1>
        <button
          onClick={() => setAdding(true)}
          className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700"
        >
          New vendor
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">GSTIN</th>
              <th className="px-4 py-2.5">Contact</th>
              <th className="px-4 py-2.5">Phone</th>
              <th className="px-4 py-2.5">Work packages</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {q.data?.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-2">
                  <div className="font-medium">{v.name}</div>
                  {v.scope && <div className="text-xs text-slate-500">{v.scope}</div>}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{v.gstin ?? '—'}</td>
                <td className="px-4 py-2 text-xs">
                  {v.contactName ?? '—'}
                  {v.email && <div className="text-slate-500">{v.email}</div>}
                </td>
                <td className="px-4 py-2 text-xs">{v.phone ?? '—'}</td>
                <td className="px-4 py-2 text-xs">{v._count.workPackages}</td>
              </tr>
            ))}
            {q.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No vendors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {adding && (
        <NewVendorDialog
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ['vendors'] });
          }}
        />
      )}
    </div>
  );
}

function NewVendorDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [scope, setScope] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      api.post('/vendors', {
        name,
        gstin: gstin || undefined,
        pan: pan || undefined,
        contactName: contactName || undefined,
        phone: phone || undefined,
        email: email || undefined,
        scope: scope || undefined,
      }),
    onSuccess: onCreated,
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 grid place-items-center z-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New vendor"
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-3"
      >
        <h2 className="text-lg font-semibold">New vendor</h2>
        <input
          placeholder="Company name"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="GSTIN"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
          />
          <input
            placeholder="PAN"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase())}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Contact name"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <input
            placeholder="Phone"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <input
          placeholder="Email"
          type="email"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <textarea
          placeholder="Scope of work (e.g. plumbing, electrical, MEP…)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !name}
            className="text-sm px-3 py-1.5 rounded-md bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {mut.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
