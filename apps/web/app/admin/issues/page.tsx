'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '~/lib/api';

interface Issue {
  id: string;
  title: string;
  body: string | null;
  severity: 'low' | 'normal' | 'high' | 'blocker';
  status: 'OPEN' | 'RESOLVED' | 'WONT_FIX';
  createdAt: string;
  workPackage: { id: string; name: string } | null;
  plotChecklistItem: { id: string; label: string } | null;
}

export default function IssuesPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['issues', 'open'],
    queryFn: () => api.get<Issue[]>('/issues'),
  });

  const resolve = useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: 'RESOLVED' | 'WONT_FIX';
      note?: string;
    }) => api.patch(`/issues/${id}`, { status, resolutionNote: note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Open issues</h1>
      <div className="rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {q.data?.map((i) => (
            <li key={i.id} className="p-4 flex items-start gap-4">
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${
                  i.severity === 'blocker'
                    ? 'bg-red-100 text-red-800'
                    : i.severity === 'high'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {i.severity}
              </span>
              <div className="flex-1">
                <div className="font-medium">{i.title}</div>
                {i.body && <p className="text-xs text-slate-600 mt-1">{i.body}</p>}
                <div className="text-xs text-slate-500 mt-1">
                  {i.workPackage && <>Work package: {i.workPackage.name}</>}
                  {i.plotChecklistItem && <>Plot item: {i.plotChecklistItem.label}</>}
                  {' · '}
                  raised {new Date(i.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    const note = prompt('Resolution note?') ?? undefined;
                    resolve.mutate({ id: i.id, status: 'RESOLVED', note });
                  }}
                  className="text-xs rounded-md bg-brand-500 text-white px-2 py-1"
                >
                  Resolve
                </button>
                <button
                  onClick={() => resolve.mutate({ id: i.id, status: 'WONT_FIX' })}
                  className="text-xs rounded-md border border-slate-300 px-2 py-1"
                >
                  Won't fix
                </button>
              </div>
            </li>
          ))}
          {q.data?.length === 0 && (
            <li className="px-4 py-8 text-center text-slate-500">No open issues.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
