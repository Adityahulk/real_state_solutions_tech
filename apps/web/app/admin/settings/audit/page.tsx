'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';

interface AuditRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  createdAt: string;
  actor: { id: string; email: string; displayName: string } | null;
}

export default function AuditPage() {
  const auditQ = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.get<{ items: AuditRow[] }>('/audit-logs'),
  });
  const roleAuditQ = useQuery({
    queryKey: ['audit', 'role-changes'],
    queryFn: () =>
      api.get<{ id: string; action: string; actorId: string; createdAt: string }[]>(
        '/audit-logs/role-changes',
      ),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-4">Role &amp; permission changes</h1>
        <div className="rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100 text-sm">
            {roleAuditQ.data?.map((r) => (
              <li key={r.id} className="px-4 py-2 flex justify-between">
                <span>
                  <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">
                    {r.action}
                  </span>{' '}
                  by {r.actorId.slice(0, 8)}…
                </span>
                <span className="text-slate-500 text-xs">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
            {roleAuditQ.data?.length === 0 && (
              <li className="px-4 py-4 text-slate-500">No changes yet.</li>
            )}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">System audit</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditQ.data?.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-slate-500 text-xs">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">{r.actor?.displayName ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {r.entityType}/{r.entityId.slice(0, 8)}…
                  </td>
                </tr>
              ))}
              {auditQ.data?.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-slate-500">
                    No entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
