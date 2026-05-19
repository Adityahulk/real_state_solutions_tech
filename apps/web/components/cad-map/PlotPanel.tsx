'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  Construction,
  CreditCard,
  ExternalLink,
  FileText,
  PenSquare,
  ShieldCheck,
} from 'lucide-react';
import { api } from '~/lib/api';
import { statusColor, statusLabel, type PlotStatus } from './SiteMap';

interface PlotSummary {
  id: string;
  plotNumber: string;
  status: PlotStatus;
  areaSqft: number | null;
  registryStatus: string;
  site: { id: string; name: string; code: string };
  allotment: {
    id: string;
    salePrice: number;
    allottedAt: string;
    owners: { name: string; sharePercent: number }[];
    payments: { totalDue: number; totalPaid: number; overdueCount: number };
    allotmentLetterDocId: string | null;
    signStatus: string | null;
  } | null;
  construction: { hasChecklist: boolean; averagePercent: number | null };
}

interface Props {
  plotId: string;
  /** "admin" → admin links, "owner" → owner links */
  audience: 'admin' | 'owner';
}

export function PlotPanel({ plotId, audience }: Props) {
  const q = useQuery({
    queryKey: ['plot-summary', plotId],
    queryFn: () => api.get<PlotSummary>(`/plots/${plotId}/summary`),
  });
  const p = q.data;
  if (!p) {
    return (
      <div className="p-6 space-y-3">
        <div className="h-5 w-24 bg-slate-100 rounded animate-pulse" />
        <div className="h-12 w-full bg-slate-100 rounded animate-pulse" />
        <div className="h-32 w-full bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  const basePath = audience === 'admin' ? '/admin/plots' : '/owner/plots';
  const paid = p.allotment?.payments.totalPaid ?? 0;
  const due = p.allotment?.payments.totalDue ?? 0;
  const paidPct = due > 0 ? (paid / due) * 100 : 0;

  return (
    <div className="px-5 py-5 space-y-5">
      <header className="pr-7">
        <div className="text-xs text-slate-500">{p.site.name}</div>
        <h2 className="text-xl font-semibold">Plot {p.plotNumber}</h2>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <StatusPill status={p.status} />
          {p.areaSqft && (
            <span className="text-xs text-slate-500">{p.areaSqft} sqft</span>
          )}
          {p.registryStatus !== 'not_started' && (
            <span className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">
              Registry: {p.registryStatus}
            </span>
          )}
        </div>
      </header>

      {/* Owners */}
      {p.allotment ? (
        <Section title="Owners" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
          <ul className="text-sm space-y-0.5">
            {p.allotment.owners.map((o, i) => (
              <li key={i} className="flex justify-between">
                <span>{o.name}</span>
                <span className="text-slate-500">{o.sharePercent}%</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : (
        <Section title="Inventory">
          <p className="text-sm text-slate-500">No active allotment.</p>
          {audience === 'admin' && (
            <Link
              href={`${basePath}/${p.id}/allot`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm rounded-md bg-brand-500 text-white px-3 py-1.5 hover:bg-brand-700"
            >
              <PenSquare className="w-3.5 h-3.5" />
              Allot plot
            </Link>
          )}
        </Section>
      )}

      {/* Payments */}
      {p.allotment && (
        <Section title="Payments" icon={<CreditCard className="w-3.5 h-3.5" />}>
          <div className="text-sm">
            <strong>₹ {paid.toLocaleString('en-IN')}</strong>{' '}
            <span className="text-slate-500">paid of ₹ {due.toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 w-full h-2 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${Math.min(100, paidPct)}%` }}
            />
          </div>
          {p.allotment.payments.overdueCount > 0 && (
            <p className="text-xs text-amber-700 mt-1">
              {p.allotment.payments.overdueCount} installment(s) overdue
            </p>
          )}
        </Section>
      )}

      {/* Construction */}
      {p.construction.hasChecklist ? (
        <Section title="Construction" icon={<Construction className="w-3.5 h-3.5" />}>
          <div className="flex items-center justify-between text-sm">
            <span>Overall progress</span>
            <strong>{(p.construction.averagePercent ?? 0).toFixed(1)}%</strong>
          </div>
          <div className="mt-2 w-full h-2 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, p.construction.averagePercent ?? 0)}%` }}
            />
          </div>
        </Section>
      ) : (
        p.allotment && (
          <Section title="Construction">
            <p className="text-sm text-slate-500">
              Construction hasn't started on this plot yet.
            </p>
          </Section>
        )
      )}

      {/* E-sign status */}
      {p.allotment?.signStatus && (
        <Section title="E-sign" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
          <span
            className={`text-xs rounded-full px-2 py-0.5 ${
              p.allotment.signStatus === 'signed'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {p.allotment.signStatus}
          </span>
        </Section>
      )}

      {/* Actions */}
      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
        <PrimaryAction href={`${basePath}/${p.id}`} label="Open full plot page" />
        {p.construction.hasChecklist && (
          <SecondaryAction
            href={`${basePath}/${p.id}/construction`}
            icon={<Construction className="w-3.5 h-3.5" />}
            label="Construction view"
          />
        )}
        {audience === 'admin' && p.allotment && (
          <SecondaryAction
            href={`/admin/allotments/${p.allotment.id}`}
            icon={<CreditCard className="w-3.5 h-3.5" />}
            label="Payments & e-sign"
          />
        )}
        {p.allotment?.allotmentLetterDocId && (
          <DocLinkRow docId={p.allotment.allotmentLetterDocId} />
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: PlotStatus }) {
  return (
    <span
      className="text-xs rounded-full px-2 py-0.5 border"
      style={{
        background: statusColor(status),
        borderColor: 'transparent',
        color: '#1e293b',
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function PrimaryAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md bg-brand-500 text-white px-3 py-2 text-sm font-medium hover:bg-brand-700 flex items-center justify-between"
    >
      {label}
      <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

function SecondaryAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
    >
      <span className="flex items-center gap-2 text-slate-700">
        {icon}
        {label}
      </span>
      <ArrowRight className="w-4 h-4 text-slate-400" />
    </Link>
  );
}

function DocLinkRow({ docId }: { docId: string }) {
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
      className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
    >
      <span className="flex items-center gap-2 text-slate-700">
        <FileText className="w-3.5 h-3.5" />
        Allotment letter
      </span>
      <ExternalLink className="w-4 h-4 text-slate-400" />
    </a>
  );
}
