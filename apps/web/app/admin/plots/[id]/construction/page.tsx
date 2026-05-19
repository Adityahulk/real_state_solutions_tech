'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api } from '~/lib/api';
import { PlotInterior } from '~/components/plot-interior/PlotInterior';

interface ChecklistItem {
  id: string;
  group: string;
  label: string;
  description: string | null;
  position: number;
  percentComplete: string;
  status: string;
  assignedEngineerId: string | null;
}
interface Checklist {
  id: string;
  template: { id: string; name: string } | null;
  items: ChecklistItem[];
}
interface Template {
  id: string;
  name: string;
  isDefault: boolean;
}
interface Engineer {
  id: string;
  displayName: string;
  email: string;
  roleAssignments: { role: { key: string } }[];
}

export default function PlotConstructionPage() {
  const { id: plotId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const cl = useQuery({
    queryKey: ['plot', plotId, 'checklist'],
    queryFn: () => api.get<Checklist | null>(`/plots/${plotId}/checklist`),
  });
  const tpls = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: () => api.get<Template[]>('/checklist-templates'),
  });
  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<Engineer[]>('/users'),
  });
  const engineers = (usersQ.data ?? []).filter((u) =>
    u.roleAssignments.some((r) => r.role.key === 'site_engineer'),
  );

  const groups = useMemo(() => {
    const m = new Map<string, ChecklistItem[]>();
    for (const i of cl.data?.items ?? []) {
      const arr = m.get(i.group) ?? [];
      arr.push(i);
      m.set(i.group, arr);
    }
    return m;
  }, [cl.data]);
  const groupRollups = useMemo(
    () =>
      [...groups.entries()].map(([name, items]) => ({
        name,
        itemCount: items.length,
        averagePercent:
          items.reduce((s, i) => s + Number(i.percentComplete), 0) / items.length,
      })),
    [groups],
  );

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const activeGroup = selectedGroup ?? groupRollups[0]?.name ?? null;

  const bootstrap = useMutation({
    mutationFn: (templateId?: string) =>
      api.post('/plot-checklists', { plotId, templateId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plot', plotId, 'checklist'] }),
  });
  const assignMut = useMutation({
    mutationFn: ({ itemId, engineerId }: { itemId: string; engineerId: string | null }) =>
      api.patch(`/plot-checklist-items/${itemId}/assign`, { engineerId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plot', plotId, 'checklist'] }),
  });

  if (!cl.isLoading && !cl.data) {
    return (
      <div className="space-y-4">
        <div>
          <Link href={`/admin/plots/${plotId}`} className="text-xs text-slate-500 hover:underline">
            ← Plot
          </Link>
          <h1 className="text-2xl font-semibold">Construction</h1>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
          <p className="text-slate-600">
            No checklist yet. Bootstrap from a template to start tracking construction.
          </p>
          {tpls.data?.length === 0 ? (
            <Link
              href="/admin/settings/checklist-templates"
              className="text-sm text-brand-500 hover:underline"
            >
              Create a template first →
            </Link>
          ) : (
            <div className="flex justify-center gap-2 flex-wrap">
              {tpls.data?.map((t) => (
                <button
                  key={t.id}
                  onClick={() => bootstrap.mutate(t.id)}
                  disabled={bootstrap.isPending}
                  className="text-sm rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  {t.name}
                  {t.isDefault && <span className="ml-1 text-xs text-emerald-600">default</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const items = activeGroup ? (groups.get(activeGroup) ?? []) : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/plots/${plotId}`} className="text-xs text-slate-500 hover:underline">
          ← Plot
        </Link>
        <h1 className="text-2xl font-semibold">Construction</h1>
        {cl.data?.template && (
          <p className="text-xs text-slate-500">From template: {cl.data.template.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_4fr] gap-6">
        <PlotInterior
          groups={groupRollups}
          selected={activeGroup}
          onSelect={setSelectedGroup}
        />

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="px-4 py-3 border-b border-slate-100 flex items-baseline justify-between">
            <h2 className="font-semibold">{activeGroup ?? 'Items'}</h2>
            {activeGroup && (
              <span className="text-xs text-slate-500">
                {items.length} item{items.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-slate-500">{item.description}</div>
                  )}
                </div>
                <div className="w-32">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, Number(item.percentComplete))}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums w-9 text-right">
                      {Number(item.percentComplete).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <select
                  value={item.assignedEngineerId ?? ''}
                  onChange={(e) =>
                    assignMut.mutate({
                      itemId: item.id,
                      engineerId: e.target.value || null,
                    })
                  }
                  className="text-xs border border-slate-200 rounded px-2 py-1 w-32"
                >
                  <option value="">Unassigned</option>
                  {engineers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                Pick a zone on the left.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
