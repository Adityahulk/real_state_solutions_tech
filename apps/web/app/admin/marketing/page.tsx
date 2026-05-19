'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '~/lib/api';

interface Task {
  id: string;
  title: string;
  brief: string | null;
  status:
    | 'BRIEFED'
    | 'RAW_UPLOADED'
    | 'EDIT_IN_PROGRESS'
    | 'EDIT_UPLOADED'
    | 'REVISION_REQUESTED'
    | 'APPROVED'
    | 'PUBLISHED';
  deadline: string | null;
  videographerId: string | null;
  editorId: string | null;
  siteId: string | null;
  plotId: string | null;
  createdAt: string;
}

interface SiteRow {
  id: string;
  name: string;
}

export default function MarketingPage() {
  const qc = useQueryClient();
  const tasksQ = useQuery({
    queryKey: ['media-tasks'],
    queryFn: () => api.get<Task[]>('/media-tasks'),
  });
  const sitesQ = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get<SiteRow[]>('/sites'),
  });
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Marketing tasks</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700"
        >
          New task
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Deadline</th>
              <th className="px-4 py-2.5">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasksQ.data?.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/admin/marketing/${t.id}`} className="font-medium hover:underline">
                    {t.title}
                  </Link>
                  {t.brief && <div className="text-xs text-slate-500">{t.brief}</div>}
                </td>
                <td className="px-4 py-2 text-xs">{t.status}</td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {t.deadline ? new Date(t.deadline).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {new Date(t.createdAt).toLocaleDateString('en-IN')}
                </td>
              </tr>
            ))}
            {tasksQ.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No tasks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {creating && sitesQ.data && (
        <NewTaskDialog
          sites={sitesQ.data}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['media-tasks'] });
          }}
        />
      )}
    </div>
  );
}

function NewTaskDialog({
  sites,
  onClose,
  onCreated,
}: {
  sites: SiteRow[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      api.post('/media-tasks', {
        title,
        brief: brief || undefined,
        siteId: siteId || undefined,
        deadline: deadline || undefined,
      }),
    onSuccess: onCreated,
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 grid place-items-center z-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New marketing task"
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-3"
      >
        <h2 className="text-lg font-semibold">New marketing task</h2>
        <input
          placeholder="Title (e.g. Drone shoot — Phase 1)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Brief: shots needed, hero focus, golden-hour vs daytime, music…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={4}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border border-slate-300">
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !title || !siteId}
            className="text-sm px-3 py-1.5 rounded-md bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {mut.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
