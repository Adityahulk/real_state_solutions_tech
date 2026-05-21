import {
  Map,
  Hammer,
  FileSignature,
  Wallet,
  Video,
  Users,
  ShieldCheck,
  Brain,
  Receipt,
  Building2,
  Layers,
  GitBranch,
} from 'lucide-react';

type Status = 'live' | 'building' | 'roadmap';

interface Solution {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  status: Status;
  points?: string[];
}

const SOLUTIONS: Solution[] = [
  {
    icon: Map,
    title: 'CAD-to-CRM site mapping',
    body:
      'Upload a DXF or GeoJSON and we extract every plot, road, and amenity into an interactive map your sales team can sell from on day one.',
    status: 'live',
    points: ['Versioned drawings', 'Owner-side map portal', 'GIS-grade accuracy'],
  },
  {
    icon: Hammer,
    title: 'Construction management',
    body:
      'Track every milestone, work package, and site-engineer update with geotagged photos, offline-first PWA, and a real-time progress feed.',
    status: 'live',
    points: ['Offline-first engineer app', 'Geotagged proof', 'Vendor work packages'],
  },
  {
    icon: FileSignature,
    title: 'Plot allotment & e-sign',
    body:
      'Generate allotment letters, capture multi-owner shares, and route everything through Digio e-sign without printing a single page.',
    status: 'live',
    points: ['Digio integration', 'Multi-owner shares', 'Auto-retry on failure'],
  },
  {
    icon: Wallet,
    title: 'Payments & receipts',
    body:
      'Per-plot schedules, gateway integration, auto-reconciliation and a buyer portal that always knows what they owe — and when.',
    status: 'live',
    points: ['Gateway-agnostic', 'Auto-reminders', 'Buyer self-serve'],
  },
  {
    icon: ShieldCheck,
    title: 'RERA compliance reporting',
    body:
      'One-click quarterly RERA reports in the exact MahaRERA / state-specific CSV formats. Audit-ready, no spreadsheet exports.',
    status: 'live',
    points: ['MahaRERA CSV ready', 'Audit log per row', 'Project snapshot archive'],
  },
  {
    icon: Video,
    title: 'Marketing asset pipeline',
    body:
      'Brief, shoot, review, approve, publish — your videographers, editors and marketing head working out of one queue with Mux-backed playback.',
    status: 'live',
    points: ['Mux video pipeline', 'Stakeholder review', 'Public gallery feed'],
  },
  {
    icon: Users,
    title: 'Owner & buyer portal',
    body:
      'Buyers see their plot, their schedule, their documents — and a live progress card pulled from your site engineers in real time.',
    status: 'live',
    points: ['Plot timeline', 'Document vault', 'KYC capture'],
  },
  {
    icon: Layers,
    title: 'Real estate CRM',
    body:
      'Native lead-to-allotment pipeline purpose-built for plot sales: site visits, broker network, EOI handling, and conversion analytics.',
    status: 'building',
    points: ['Site-visit booking', 'Broker payouts', 'WhatsApp Business native'],
  },
  {
    icon: Brain,
    title: 'AI expense intelligence',
    body:
      'Our model watches every PO and invoice, flags overspend against forecast, and recommends vendors that historically saved you money.',
    status: 'building',
    points: ['Anomaly detection', 'Vendor switching ROI', 'Monthly board pack auto-drafted'],
  },
  {
    icon: GitBranch,
    title: 'Construction forecasting AI',
    body:
      'Trained on milestone deltas across our customer base, the model predicts which sites will slip and where to put the next engineer.',
    status: 'roadmap',
    points: ['Slip probability per milestone', 'Crew-load suggestions'],
  },
  {
    icon: Receipt,
    title: 'Tax & ledger sync',
    body:
      'Two-way sync with Tally and Zoho Books — RE-specific charts of accounts, TDS mapping, and per-project P&L without manual posting.',
    status: 'roadmap',
  },
  {
    icon: Building2,
    title: 'Multi-society management',
    body:
      'Once a township is allotted, the same data powers society maintenance, billing, and facility tickets. No second platform required.',
    status: 'roadmap',
  },
];

export function Solutions() {
  return (
    <section id="solutions" className="relative bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Header />

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <SolutionCard key={s.title} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <div className="max-w-3xl">
      <div className="text-xs uppercase tracking-[0.22em] text-brand-700 font-semibold">
        Solutions
      </div>
      <h2 className="mt-3 text-4xl lg:text-5xl font-semibold tracking-tight bg-gradient-to-br from-slate-900 via-blue-700 to-sky-500 bg-clip-text text-transparent">
        One platform for every team on your project.
      </h2>
      <p className="mt-5 text-lg text-slate-600 leading-relaxed">
        Sales, construction, finance, marketing, RERA — they all touch the same
        plot data. Rest is the first platform built around that fact, so your
        teams stop reconciling and start shipping.
      </p>
    </div>
  );
}

function SolutionCard({ icon: Icon, title, body, status, points }: Solution) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-6 flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/10">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-50 to-sky-50 border border-brand-500/15 flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand-700" />
        </div>
        <StatusPill status={status} />
      </div>

      <h3 className="mt-5 text-[17px] font-semibold text-slate-900 tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>

      {points && (
        <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-brand-500" />
              {p}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function StatusPill({ status }: { status: Status }) {
  const cfg = {
    live: { label: 'Shipping', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    building: { label: 'In build', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    roadmap: { label: 'On the roadmap', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  }[status];
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}
