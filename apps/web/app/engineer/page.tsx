'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';

interface Task {
  kind: 'work_package' | 'plot_checklist_item';
  id: string;
  title: string;
  subtitle: string;
  percentComplete: number;
  status: string;
  deadline: string | null;
  parentLink: string;
}

export default function EngineerHome() {
  const q = useQuery({
    queryKey: ['me', 'tasks'],
    queryFn: () => api.get<Task[]>('/me/tasks'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My tasks</h1>
      {q.isLoading && <p className="text-slate-500 text-sm">Loading…</p>}
      {q.data?.length === 0 && (
        <p className="text-slate-500 text-sm">
          Nothing assigned to you yet. Admin assigns work packages from the dev item /
          construction screens.
        </p>
      )}
      <ul className="space-y-2">
        {q.data?.map((t) => (
          <li key={`${t.kind}:${t.id}`}>
            <Link
              href={`/engineer/tasks/${t.kind}/${t.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-500 transition"
            >
              <div className="flex items-baseline justify-between">
                <div className="font-medium">{t.title}</div>
                <span className="text-xs text-slate-500">{t.status}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{t.subtitle}</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: `${Math.min(100, t.percentComplete)}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums w-9 text-right">
                  {Math.round(t.percentComplete)}%
                </span>
              </div>
              {t.deadline && (
                <div className="text-xs text-slate-500 mt-1">
                  Due {new Date(t.deadline).toLocaleDateString('en-IN')}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
