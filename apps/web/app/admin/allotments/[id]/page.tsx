'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '~/lib/api';

interface Allotment {
  id: string;
  status: string;
  salePrice: string;
  allottedAt: string;
  allotmentLetterDocId: string | null;
  plot: { id: string; plotNumber: string; site: { name: string } };
  ownerShares: {
    sharePercent: string;
    person: { id: string; fullName: string; panMasked: string | null } | null;
    company: { id: string; legalName: string } | null;
  }[];
  payments: PaymentRow[];
}
interface PaymentRow {
  id: string;
  label: string;
  amount: string;
  dueDate: string;
  status: string;
  paidAt: string | null;
  razorpayLinkId: string | null;
  receiptDocId: string | null;
}

export default function AdminAllotmentPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const allotmentQ = useQuery({
    queryKey: ['allotment', id],
    queryFn: () => api.get<Allotment>(`/allotments/${id}`),
  });
  const docQ = useQuery({
    queryKey: ['allotment-doc', id],
    enabled: !!allotmentQ.data?.allotmentLetterDocId,
    queryFn: () =>
      api.get<DocWithSigners>(`/documents/${allotmentQ.data!.allotmentLetterDocId}`),
  });

  const a = allotmentQ.data;
  const hasSchedule = (a?.payments?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Allotment</h1>
        <p className="text-sm text-slate-500">
          {a?.plot.site.name} · Plot {a?.plot.plotNumber} · ₹{' '}
          {a && Number(a.salePrice).toLocaleString('en-IN')}
        </p>
      </div>

      {a && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
          <h2 className="font-semibold">Owners</h2>
          <ul className="text-sm">
            {a.ownerShares.map((s, i) => (
              <li key={i}>
                {s.person?.fullName ?? s.company?.legalName} — {s.sharePercent}%
                {s.person?.panMasked && (
                  <span className="text-slate-500 ml-2 text-xs font-mono">
                    PAN {s.person.panMasked}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {docQ.data && <EsignBlock doc={docQ.data} />}

      {a && !hasSchedule && <CreateScheduleBlock allotmentId={a.id} />}
      {a && hasSchedule && <PaymentSchedule allotmentId={a.id} payments={a.payments} />}
    </div>
  );
}

interface DocWithSigners {
  id: string;
  signStatus: string | null;
  signProvider: string | null;
  signers:
    | { name: string; identifier: string; role: string; status: string; signLink: string | null }[]
    | null;
}

function EsignBlock({ doc }: { doc: DocWithSigners }) {
  if (!doc.signers || doc.signers.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">E-sign status</h2>
        <span className="text-xs rounded-full bg-slate-100 text-slate-700 px-2 py-0.5">
          {doc.signStatus ?? 'not requested'}
        </span>
      </div>
      <ul className="text-sm divide-y divide-slate-100">
        {doc.signers.map((s, i) => (
          <li key={i} className="flex items-center justify-between py-2">
            <span>
              {s.name} <span className="text-slate-500 text-xs">({s.role})</span>
            </span>
            <span className="flex items-center gap-2">
              <span
                className={
                  s.status === 'signed'
                    ? 'text-emerald-600 text-xs'
                    : 'text-amber-600 text-xs'
                }
              >
                {s.status}
              </span>
              {s.status !== 'signed' && s.signLink && (
                <a
                  href={s.signLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-500 hover:underline"
                >
                  Sign now →
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreateScheduleBlock({ allotmentId }: { allotmentId: string }) {
  const qc = useQueryClient();
  const [template, setTemplate] = useState<'standard_4' | 'standard_6' | 'construction_linked'>(
    'standard_4',
  );
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const mut = useMutation({
    mutationFn: () =>
      api.post('/payments/schedules', { allotmentId, template, startDate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allotment', allotmentId] }),
  });
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="font-semibold">Payment schedule</h2>
      <p className="text-sm text-slate-600">
        No schedule yet. Pick a template — installment dates derive from the start date.
      </p>
      <div className="flex gap-2 items-end">
        <label className="text-xs text-slate-600 flex flex-col">
          Template
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as never)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="standard_4">Standard (4 installments)</option>
            <option value="standard_6">Standard (6 installments)</option>
            <option value="construction_linked">Construction-linked (10)</option>
          </select>
        </label>
        <label className="text-xs text-slate-600 flex flex-col">
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="rounded-md bg-brand-500 text-white px-3 py-2 text-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {mut.isPending ? 'Generating…' : 'Generate schedule'}
        </button>
      </div>
    </div>
  );
}

function PaymentSchedule({
  allotmentId,
  payments,
}: {
  allotmentId: string;
  payments: PaymentRow[];
}) {
  const qc = useQueryClient();
  const markPaid = useMutation({
    mutationFn: (installmentId: string) =>
      api.post('/payments/mark-paid', { installmentId, reference: 'manual' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allotment', allotmentId] }),
  });
  const total = payments.reduce((s, p) => s + Number(p.amount), 0);
  const paid = payments
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Payment schedule</h2>
        <span className="text-sm text-slate-600">
          Paid <strong>₹ {paid.toLocaleString('en-IN')}</strong> of ₹{' '}
          {total.toLocaleString('en-IN')}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-slate-500 text-left">
          <tr>
            <th className="py-2">Milestone</th>
            <th className="py-2">Due</th>
            <th className="py-2 text-right">Amount</th>
            <th className="py-2 text-right">Status</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((p) => (
            <tr key={p.id}>
              <td className="py-2">{p.label}</td>
              <td className="py-2 text-slate-600">
                {new Date(p.dueDate).toLocaleDateString('en-IN')}
              </td>
              <td className="py-2 text-right">
                ₹ {Number(p.amount).toLocaleString('en-IN')}
              </td>
              <td className="py-2 text-right">
                <span
                  className={
                    p.status === 'paid' ? 'text-emerald-600 text-xs' : 'text-amber-600 text-xs'
                  }
                >
                  {p.status}
                </span>
              </td>
              <td className="py-2 text-right">
                {p.status !== 'paid' && (
                  <button
                    onClick={() => markPaid.mutate(p.id)}
                    disabled={markPaid.isPending}
                    className="text-xs rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50"
                  >
                    Mark paid (offline)
                  </button>
                )}
                {p.status === 'paid' && p.receiptDocId && (
                  <ReceiptLink docId={p.receiptDocId} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReceiptLink({ docId }: { docId: string }) {
  const q = useQuery({
    queryKey: ['doc-url', docId],
    queryFn: () => api.get<{ url: string }>(`/documents/${docId}/url`),
  });
  if (!q.data?.url) return null;
  return (
    <a
      href={q.data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-brand-500 hover:underline"
    >
      Receipt →
    </a>
  );
}
