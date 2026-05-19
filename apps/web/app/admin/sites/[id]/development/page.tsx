'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';

interface WorkPackage {
  id: string;
  name: string;
  percentComplete: string;
  status: string;
  deadline: string | null;
  vendor: { id: string; name: string } | null;
  assignedEngineerId: string | null;
}
interface DevItem {
  id: string;
  kind: string;
  label: string;
  status: string;
  deadline: string | null;
  workPackages: WorkPackage[];
}

export default function SiteDevelopmentPage() {
  const { id: siteId } = useParams<{ id: string }>();

  const itemsQ = useQuery({
    queryKey: ['site', siteId, 'dev-items'],
    queryFn: () => api.get<DevItem[]>(`/sites/${siteId}/dev-items`),
  });

  const byKind = new Map<string, DevItem[]>();
  for (const i of itemsQ.data ?? []) {
    const arr = byKind.get(i.kind) ?? [];
    arr.push(i);
    byKind.set(i.kind, arr);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/admin/sites/${siteId}`}
            className="text-xs text-slate-500 hover:underline"
          >
            ← Site map
          </Link>
          <h1 className="text-2xl font-semibold">Development</h1>
        </div>
      </div>

      {itemsQ.data?.length === 0 && (
        <p className="text-slate-500 text-sm">
          No development items yet. They're created automatically when you activate a CAD
          drawing with non-plot layers (roads, poles, club house, …).
        </p>
      )}

      {[...byKind.entries()].map(([kind, items]) => (
        <section key={kind} className="space-y-2">
          <h2 className="text-sm uppercase tracking-wider text-slate-500">
            {kind.replace(/_/g, ' ')}
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {items.map((i) => (
              <div key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/admin/dev-items/${i.id}`}
                    className="font-medium hover:underline"
                  >
                    {i.label}
                  </Link>
                  <span
                    className={
                      i.status === 'COMPLETED'
                        ? 'text-emerald-600 text-xs'
                        : i.status === 'IN_PROGRESS'
                        ? 'text-amber-600 text-xs'
                        : 'text-slate-500 text-xs'
                    }
                  >
                    {i.status}
                  </span>
                </div>
                {i.workPackages.length > 0 ? (
                  <ul className="mt-2 text-sm space-y-1">
                    {i.workPackages.map((w) => (
                      <li key={w.id} className="flex items-center justify-between">
                        <span>
                          {w.name}
                          {w.vendor && (
                            <span className="text-slate-500 text-xs"> · {w.vendor.name}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                            {Number(w.percentComplete).toFixed(0)}%
                          </span>
                          <span className="text-slate-500">{w.status}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">No work packages yet.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
