'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '~/lib/api';

interface Submission {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  panMasked: string | null;
  aadhaarLast4: string | null;
  submittedAt: string;
  person: { id: string; fullName: string; email: string | null };
  panDocKey: string | null;
  aadhaarDocKey: string | null;
  addressDocKey: string | null;
  rejectionReason: string | null;
}

export default function AdminKycPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['kyc-submissions'],
    queryFn: () => api.get<Submission[]>('/kyc/submissions'),
  });
  const decide = useMutation({
    mutationFn: ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: 'verify' | 'reject';
      reason?: string;
    }) => api.post(`/kyc/submissions/${id}/decision`, { decision, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc-submissions'] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">KYC verification</h1>
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Person</th>
              <th className="px-4 py-2.5">PAN</th>
              <th className="px-4 py-2.5">Aadhaar</th>
              <th className="px-4 py-2.5">Submitted</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {q.data?.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2">
                  <div className="font-medium">{s.person.fullName}</div>
                  <div className="text-xs text-slate-500">{s.person.email ?? '—'}</div>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{s.panMasked ?? '—'}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {s.aadhaarLast4 ? `XXXX-XXXX-${s.aadhaarLast4}` : '—'}
                </td>
                <td className="px-4 py-2 text-slate-500 text-xs">
                  {new Date(s.submittedAt).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      s.status === 'VERIFIED'
                        ? 'text-emerald-600 text-xs'
                        : s.status === 'REJECTED'
                        ? 'text-red-600 text-xs'
                        : 'text-amber-600 text-xs'
                    }
                  >
                    {s.status}
                  </span>
                  {s.rejectionReason && (
                    <div className="text-xs text-slate-500">{s.rejectionReason}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {s.status === 'SUBMITTED' && (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          const reason = prompt('Reason for rejection?') ?? undefined;
                          if (!reason) return;
                          decide.mutate({ id: s.id, decision: 'reject', reason });
                        }}
                        className="text-xs rounded-md border border-red-300 text-red-700 px-2 py-1"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => decide.mutate({ id: s.id, decision: 'verify' })}
                        className="text-xs rounded-md bg-brand-500 text-white px-2 py-1"
                      >
                        Verify
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {q.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No submissions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
