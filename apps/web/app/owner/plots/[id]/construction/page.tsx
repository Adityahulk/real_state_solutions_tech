'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';
import { PlotInterior } from '~/components/plot-interior/PlotInterior';

interface ChecklistItem {
  id: string;
  group: string;
  label: string;
  percentComplete: string;
  status: string;
}
interface Checklist {
  id: string;
  items: ChecklistItem[];
}

export default function OwnerConstruction() {
  const { id: plotId } = useParams<{ id: string }>();
  const cl = useQuery({
    queryKey: ['owner', 'plot', plotId, 'checklist'],
    queryFn: () => api.get<Checklist | null>(`/plots/${plotId}/checklist`),
  });

  const groups = useMemo(() => {
    const m = new Map<string, ChecklistItem[]>();
    for (const i of cl.data?.items ?? []) {
      const arr = m.get(i.group) ?? [];
      arr.push(i);
      m.set(i.group, arr);
    }
    return m;
  }, [cl.data]);

  const rollups = useMemo(
    () =>
      [...groups.entries()].map(([name, items]) => ({
        name,
        itemCount: items.length,
        averagePercent:
          items.reduce((s, i) => s + Number(i.percentComplete), 0) / items.length,
      })),
    [groups],
  );

  const overall =
    rollups.length === 0
      ? 0
      : rollups.reduce((s, r) => s + r.averagePercent, 0) / rollups.length;

  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ?? rollups[0]?.name ?? null;
  const items = active ? (groups.get(active) ?? []) : [];

  if (!cl.isLoading && !cl.data) {
    return (
      <div className="space-y-3">
        <Link href={`/owner/plots/${plotId}`} className="text-xs text-slate-500 hover:underline">
          ← Plot
        </Link>
        <h1 className="text-2xl font-semibold">Construction</h1>
        <p className="text-slate-500 text-sm">
          Construction hasn't started on your plot yet. Updates appear here as soon as the
          builder bootstraps the checklist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/owner/plots/${plotId}`} className="text-xs text-slate-500 hover:underline">
          ← Plot
        </Link>
        <h1 className="text-2xl font-semibold">Construction</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-700">Overall progress</span>
          <span className="text-lg font-semibold">{overall.toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_4fr] gap-6">
        <PlotInterior groups={rollups} selected={active} onSelect={setSelected} />

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="px-4 py-3 border-b border-slate-100 flex items-baseline justify-between">
            <h2 className="font-semibold">{active ?? 'Items'}</h2>
            {active && (
              <span className="text-xs text-slate-500">
                {items.length} item{items.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm">{item.label}</div>
                </div>
                <div className="w-32">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, Number(item.percentComplete))}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums w-9 text-right">
                      {Number(item.percentComplete).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
