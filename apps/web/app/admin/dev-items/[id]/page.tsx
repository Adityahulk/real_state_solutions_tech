'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '~/lib/api';

interface WorkPackage {
  id: string;
  name: string;
  percentComplete: string;
  status: string;
  deadline: string | null;
  budget: string | null;
  vendor: { id: string; name: string } | null;
  assignedEngineerId: string | null;
}
interface DevItem {
  id: string;
  kind: string;
  label: string;
  status: string;
  deadline: string | null;
  site: { id: string; name: string };
  workPackages: WorkPackage[];
}

interface Vendor {
  id: string;
  name: string;
}

interface User {
  id: string;
  displayName: string;
  email: string;
  roleAssignments: { role: { key: string } }[];
}

export default function DevItemPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const itemQ = useQuery({
    queryKey: ['dev-item', id],
    queryFn: () => api.get<DevItem>(`/dev-items/${id}`),
  });
  const vendorsQ = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get<Vendor[]>('/vendors'),
  });
  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users'),
  });
  const engineers = (usersQ.data ?? []).filter((u) =>
    u.roleAssignments.some((r) => r.role.key === 'site_engineer'),
  );

  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/sites/${itemQ.data?.site.id ?? ''}/development`}
          className="text-xs text-slate-500 hover:underline"
        >
          ← {itemQ.data?.site.name} · Development
        </Link>
        <h1 className="text-2xl font-semibold">{itemQ.data?.label}</h1>
        <p className="text-xs text-slate-500">
          {itemQ.data?.kind} · {itemQ.data?.status}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Work packages</h2>
          <button
            onClick={() => setAdding(true)}
            className="text-sm rounded-md bg-brand-500 text-white px-3 py-1 hover:bg-brand-700"
          >
            New work package
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 text-left">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Vendor</th>
              <th className="py-2">Engineer</th>
              <th className="py-2">Deadline</th>
              <th className="py-2 text-right">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itemQ.data?.workPackages.map((w) => (
              <WorkPackageRow
                key={w.id}
                wp={w}
                vendors={vendorsQ.data ?? []}
                engineers={engineers}
              />
            ))}
            {itemQ.data?.workPackages.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500">
                  No work packages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && itemQ.data && (
        <NewWpDialog
          devItemId={itemQ.data.id}
          vendors={vendorsQ.data ?? []}
          engineers={engineers}
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ['dev-item', id] });
          }}
        />
      )}
    </div>
  );
}

function WorkPackageRow({
  wp,
  vendors,
  engineers,
}: {
  wp: WorkPackage;
  vendors: Vendor[];
  engineers: User[];
}) {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.patch(`/work-packages/${wp.id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dev-item'] }),
  });
  return (
    <tr>
      <td className="py-2">
        <Link
          href={`/admin/work-packages/${wp.id}`}
          className="hover:underline"
        >
          {wp.name}
        </Link>
      </td>
      <td className="py-2">
        <select
          value={wp.vendor?.id ?? ''}
          onChange={(e) =>
            update.mutate({ vendorId: e.target.value || null })
          }
          className="text-xs border border-slate-300 rounded px-2 py-1"
        >
          <option value="">—</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2">
        <select
          value={wp.assignedEngineerId ?? ''}
          onChange={(e) =>
            update.mutate({ assignedEngineerId: e.target.value || null })
          }
          className="text-xs border border-slate-300 rounded px-2 py-1"
        >
          <option value="">—</option>
          {engineers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 text-xs text-slate-500">
        {wp.deadline ? new Date(wp.deadline).toLocaleDateString('en-IN') : '—'}
      </td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="w-32 h-2 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full bg-brand-500"
              style={{ width: `${Math.min(100, Number(wp.percentComplete))}%` }}
            />
          </div>
          <span className="text-xs tabular-nums w-10 text-right">
            {Number(wp.percentComplete).toFixed(0)}%
          </span>
        </div>
      </td>
    </tr>
  );
}

function NewWpDialog({
  devItemId,
  vendors,
  engineers,
  onClose,
  onCreated,
}: {
  devItemId: string;
  vendors: Vendor[];
  engineers: User[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      api.post('/work-packages', {
        devItemId,
        name,
        vendorId: vendorId || null,
        assignedEngineerId: engineerId || null,
        deadline: deadline || undefined,
        budget: budget ? Number(budget) : undefined,
      }),
    onSuccess: onCreated,
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 grid place-items-center z-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New work package"
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-3"
      >
        <h2 className="text-lg font-semibold">New work package</h2>
        <input
          placeholder="Name (e.g. Foundation, Plumbing rough-in)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Vendor (optional)</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <select
            value={engineerId}
            onChange={(e) => setEngineerId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Engineer (optional)</option>
            {engineers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Budget (₹)"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
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
