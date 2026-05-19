'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '~/lib/api';

interface PlotDetail {
  id: string;
  plotNumber: string;
  status: string;
  areaSqft: string | null;
  registryStatus: string;
  site: { id: string; name: string };
  allotments: {
    id: string;
    status: string;
    salePrice: string;
    allottedAt: string;
    allotmentLetterDocId: string | null;
    ownerShares: {
      sharePercent: string;
      person: { fullName: string } | null;
      company: { legalName: string } | null;
      nomineeName: string | null;
    }[];
    payments: {
      id: string;
      label: string;
      amount: string;
      dueDate: string;
      status: string;
      receiptDocId: string | null;
    }[];
  }[];
}

interface DocWithSigners {
  id: string;
  signStatus: string | null;
  signers:
    | { name: string; identifier: string; role: string; status: string; signLink: string | null }[]
    | null;
}

export default function OwnerPlotDetail() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({
    queryKey: ['owner', 'plot', id],
    queryFn: () => api.get<PlotDetail>(`/plots/${id}`),
  });

  const plot = q.data;
  const active = plot?.allotments.find((a) => a.status === 'active');

  const docQ = useQuery({
    queryKey: ['owner', 'doc', active?.allotmentLetterDocId],
    enabled: !!active?.allotmentLetterDocId,
    queryFn: () => api.get<DocWithSigners>(`/documents/${active!.allotmentLetterDocId}`),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">{plot?.site.name}</div>
        <h1 className="text-2xl font-semibold">Plot {plot?.plotNumber}</h1>
        <div className="text-sm text-slate-600">
          {plot?.areaSqft && <span>{plot.areaSqft} sqft · </span>}
          Status: {plot?.status} · Registry: {plot?.registryStatus}
        </div>
      </div>

      {active && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold">Allotment</h2>
          <div className="text-sm">
            Sale price:{' '}
            <strong>₹ {Number(active.salePrice).toLocaleString('en-IN')}</strong> · allotted on{' '}
            {new Date(active.allottedAt).toLocaleDateString('en-IN')}
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500 mb-1">Owners</div>
            <ul className="text-sm space-y-1">
              {active.ownerShares.map((s, i) => (
                <li key={i}>
                  {s.person?.fullName ?? s.company?.legalName} — {s.sharePercent}%
                  {s.nomineeName && (
                    <span className="text-slate-500 text-xs"> · Nominee: {s.nomineeName}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {active.allotmentLetterDocId && (
            <DocLink docId={active.allotmentLetterDocId} label="Download allotment letter" />
          )}
          {docQ.data && <OwnerEsignSection doc={docQ.data} />}
          <div className="pt-2 border-t border-slate-100 flex justify-between">
            <Link
              href={`/owner/plots/${id}/construction`}
              className="text-sm text-brand-500 hover:underline"
            >
              Construction progress →
            </Link>
            <Link
              href={`/owner/plots/${id}/transfer`}
              className="text-sm text-brand-500 hover:underline"
            >
              Initiate resale / transfer →
            </Link>
          </div>
        </div>
      )}

      {active && active.payments.length > 0 && (
        <PaymentTable payments={active.payments} />
      )}
    </div>
  );
}

function OwnerEsignSection({ doc }: { doc: DocWithSigners }) {
  if (!doc.signers?.length) return null;
  const me = doc.signers.find((s) => s.role === 'buyer' && s.status === 'pending');
  return (
    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-amber-900">
          Letter signing status: <strong>{doc.signStatus ?? 'awaiting'}</strong>
        </span>
        {me?.signLink && (
          <a
            href={me.signLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-900 underline text-sm"
          >
            Sign now →
          </a>
        )}
      </div>
    </div>
  );
}

function PaymentTable({
  payments,
}: {
  payments: {
    id: string;
    label: string;
    amount: string;
    dueDate: string;
    status: string;
    receiptDocId: string | null;
  }[];
}) {
  const qc = useQueryClient();
  const payMut = useMutation({
    mutationFn: (installmentId: string) =>
      api.post<{ shortUrl?: string; paymentLinkId: string; simulated: boolean }>(
        '/payments/links',
        { installmentId },
      ),
    onSuccess: (data) => {
      if (data.shortUrl) {
        window.open(data.shortUrl, '_blank', 'noopener,noreferrer');
      }
      qc.invalidateQueries({ queryKey: ['owner'] });
    },
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold mb-3">Payment schedule</h2>
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
                    p.status === 'paid'
                      ? 'text-emerald-600 text-xs'
                      : 'text-amber-600 text-xs'
                  }
                >
                  {p.status}
                </span>
              </td>
              <td className="py-2 text-right">
                {p.status === 'paid' && p.receiptDocId && (
                  <DocLink docId={p.receiptDocId} label="Receipt" />
                )}
                {p.status !== 'paid' && (
                  <button
                    onClick={() => payMut.mutate(p.id)}
                    disabled={payMut.isPending}
                    className="text-xs rounded-md bg-brand-500 text-white px-2 py-1 hover:bg-brand-700 disabled:opacity-60"
                  >
                    Pay
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocLink({ docId, label }: { docId: string; label: string }) {
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
      className="text-sm text-brand-500 hover:underline"
    >
      {label} →
    </a>
  );
}
