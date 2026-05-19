'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';

interface OwnerShare {
  sharePercent: string | number;
  person: { id: string; fullName: string } | null;
  company: { id: string; legalName: string } | null;
  nomineeName: string | null;
}
interface Allotment {
  id: string;
  status: string;
  salePrice: string;
  allottedAt: string;
  allotmentLetterDocId: string | null;
  ownerShares: OwnerShare[];
}
interface PlotDetail {
  id: string;
  plotNumber: string;
  status: string;
  areaSqft: string | null;
  registryStatus: string;
  site: { id: string; name: string; code: string };
  allotments: Allotment[];
  transfers: { id: string; status: string; salePrice: string; createdAt: string }[];
}

export default function PlotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const plotQ = useQuery({
    queryKey: ['plot', id],
    queryFn: () => api.get<PlotDetail>(`/plots/${id}`),
  });
  const timelineQ = useQuery({
    queryKey: ['plot', id, 'timeline'],
    queryFn: () => api.get<TimelineEvent[]>(`/plots/${id}/timeline`),
  });

  const plot = plotQ.data;
  const active = plot?.allotments.find((a) => a.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-slate-500">
            <Link href={`/admin/sites/${plot?.site.id ?? ''}`} className="hover:underline">
              {plot?.site.name}
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">Plot {plot?.plotNumber}</h1>
          <div className="text-sm text-slate-600 mt-1 flex gap-3">
            <span>Status: <strong>{plot?.status}</strong></span>
            {plot?.areaSqft && <span>{plot.areaSqft} sqft</span>}
            <span>Registry: {plot?.registryStatus}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!active && plot && (
            <Link
              href={`/admin/plots/${plot.id}/allot`}
              className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700"
            >
              Allot plot
            </Link>
          )}
          {active && plot && (
            <Link
              href={`/admin/plots/${plot.id}/transfer`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Initiate transfer
            </Link>
          )}
        </div>
      </div>

      {active && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex justify-between items-baseline">
            <h2 className="font-semibold">Current allotment</h2>
            <span className="text-xs text-slate-500">
              {new Date(active.allottedAt).toLocaleDateString('en-IN')}
            </span>
          </div>
          <div className="text-sm">
            Sale price: <strong>₹ {Number(active.salePrice).toLocaleString('en-IN')}</strong>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500 mb-1">Owners</div>
            <ul className="text-sm space-y-1">
              {active.ownerShares.map((s, i) => (
                <li key={i}>
                  {s.person?.fullName ?? s.company?.legalName ?? 'Unknown'} —{' '}
                  <strong>{s.sharePercent}%</strong>
                  {s.nomineeName && (
                    <span className="text-slate-500 text-xs"> · Nominee: {s.nomineeName}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {active.allotmentLetterDocId && (
            <DocumentLink docId={active.allotmentLetterDocId} label="View allotment letter" />
          )}
          <Link
            href={`/admin/allotments/${active.id}`}
            className="block text-sm text-brand-500 hover:underline"
          >
            Payments &amp; e-sign →
          </Link>
          <Link
            href={`/admin/plots/${plot?.id}/construction`}
            className="block text-sm text-brand-500 hover:underline"
          >
            Construction checklist →
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold mb-3">Plot timeline</h2>
        <Timeline items={timelineQ.data ?? []} />
      </div>
    </div>
  );
}

function DocumentLink({ docId, label }: { docId: string; label: string }) {
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

interface TimelineEvent {
  kind: string;
  at: string;
  data: Record<string, unknown>;
}

function Timeline({ items }: { items: TimelineEvent[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">No events yet.</p>;
  return (
    <ol className="relative border-l-2 border-slate-100 ml-2 space-y-4">
      {items.map((e, i) => (
        <li key={i} className="pl-4 relative">
          <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white" />
          <div className="text-xs text-slate-500">{new Date(e.at).toLocaleString('en-IN')}</div>
          <div className="text-sm">
            <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">
              {e.kind}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
