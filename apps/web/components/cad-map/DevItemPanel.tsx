'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { api } from '~/lib/api';

interface DevItem {
  id: string;
  kind: string;
  label: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  deadline: string | null;
  site: { id: string; name: string };
  workPackages: {
    id: string;
    name: string;
    percentComplete: string;
    status: string;
    vendor: { id: string; name: string } | null;
  }[];
}

export function DevItemPanel({ devItemId }: { devItemId: string }) {
  const q = useQuery({
    queryKey: ['dev-item', devItemId],
    queryFn: () => api.get<DevItem>(`/dev-items/${devItemId}`),
  });
  const d = q.data;

  if (!d) {
    return (
      <div className="p-6 space-y-3">
        <div className="h-5 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="h-32 w-full bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  const avg =
    d.workPackages.length === 0
      ? 0
      : d.workPackages.reduce((s, w) => s + Number(w.percentComplete), 0) /
        d.workPackages.length;

  return (
    <div className="px-5 py-5 space-y-5">
      <header className="pr-7">
        <div className="text-xs text-slate-500 capitalize">{d.kind.replace(/_/g, ' ')}</div>
        <h2 className="text-xl font-semibold">{d.label}</h2>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 ${
              d.status === 'COMPLETED'
                ? 'bg-emerald-50 text-emerald-700'
                : d.status === 'IN_PROGRESS'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {d.status}
          </span>
          {d.deadline && (
            <span className="text-slate-500">
              due {new Date(d.deadline).toLocaleDateString('en-IN')}
            </span>
          )}
        </div>
      </header>

      <section>
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" />
          Overall progress
        </div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span>Average across {d.workPackages.length} work packages</span>
          <strong>{avg.toFixed(0)}%</strong>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${Math.min(100, avg)}%` }}
          />
        </div>
      </section>

      <section>
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
          Work packages
        </div>
        {d.workPackages.length === 0 ? (
          <p className="text-sm text-slate-500">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {d.workPackages.map((w) => (
              <li
                key={w.id}
                className="rounded-md border border-slate-200 p-3 hover:border-brand-500 transition"
              >
                <Link href={`/admin/work-packages/${w.id}`} className="block">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{w.name}</span>
                    <span className="text-xs text-slate-500">
                      {Number(w.percentComplete).toFixed(0)}%
                    </span>
                  </div>
                  {w.vendor && (
                    <div className="text-xs text-slate-500 mt-0.5">{w.vendor.name}</div>
                  )}
                  <div className="mt-1.5 w-full h-1.5 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-brand-500"
                      style={{ width: `${Math.min(100, Number(w.percentComplete))}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pt-2 border-t border-slate-100">
        <Link
          href={`/admin/dev-items/${d.id}`}
          className="rounded-md bg-brand-500 text-white px-3 py-2 text-sm font-medium hover:bg-brand-700 flex items-center justify-between"
        >
          Open detail page
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
