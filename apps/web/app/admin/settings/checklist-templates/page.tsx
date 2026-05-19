'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '~/lib/api';

interface Template {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  _count: { items: number; instances: number };
}

interface Item {
  group: string;
  label: string;
  description?: string;
  position: number;
}

const STARTER_ITEMS: Item[] = [
  { group: 'Civil', label: 'Foundation excavation', position: 0 },
  { group: 'Civil', label: 'Foundation casting', position: 1 },
  { group: 'Civil', label: 'Plinth', position: 2 },
  { group: 'Civil', label: 'Brickwork', position: 3 },
  { group: 'Plumbing', label: 'Rough-in', position: 0 },
  { group: 'Plumbing', label: 'Finishing', position: 1 },
  { group: 'Electrical', label: 'Conduit + wiring', position: 0 },
  { group: 'Electrical', label: 'Switchboards', position: 1 },
  { group: 'Painting', label: 'Primer', position: 0 },
  { group: 'Painting', label: 'Topcoat', position: 1 },
  { group: 'Finishing', label: 'Flooring', position: 0 },
  { group: 'Finishing', label: 'Doors and windows', position: 1 },
  { group: 'Garden', label: 'Landscaping', position: 0 },
];

export default function ChecklistTemplatesPage() {
  const qc = useQueryClient();
  const tplsQ = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: () => api.get<Template[]>('/checklist-templates'),
  });
  const [creating, setCreating] = useState(false);

  const createMut = useMutation({
    mutationFn: (input: { name: string; isDefault: boolean; items: Item[] }) =>
      api.post('/checklist-templates', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist-templates'] });
      setCreating(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Checklist templates</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700"
        >
          New template
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Default?</th>
              <th className="px-4 py-2.5 text-right">Items</th>
              <th className="px-4 py-2.5 text-right">Plots using</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tplsQ.data?.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 font-medium">{t.name}</td>
                <td className="px-4 py-2">
                  {t.isDefault ? (
                    <span className="text-xs text-emerald-600">DEFAULT</span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">{t._count.items}</td>
                <td className="px-4 py-2 text-right">{t._count.instances}</td>
              </tr>
            ))}
            {tplsQ.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No templates yet. The "Standard plot" starter below is a good baseline.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 bg-slate-900/40 grid place-items-center z-10">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="New checklist template"
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-3"
          >
            <h2 className="text-lg font-semibold">New template</h2>
            <p className="text-xs text-slate-500">
              We'll pre-fill {STARTER_ITEMS.length} standard items grouped by trade
              (Civil / Plumbing / Electrical / Painting / Finishing / Garden). Edit later.
            </p>
            <button
              onClick={() =>
                createMut.mutate({
                  name: 'Standard plot',
                  isDefault: true,
                  items: STARTER_ITEMS,
                })
              }
              disabled={createMut.isPending}
              className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-60"
            >
              {createMut.isPending ? 'Creating…' : 'Create "Standard plot"'}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="ml-2 text-sm px-3 py-1.5 rounded-md border border-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
