import { Sparkles, TrendingDown, AlertTriangle, BarChart3, Zap } from 'lucide-react';

export function AISection() {
  return (
    <section id="ai" className="relative bg-[#050b1c] text-white overflow-hidden py-24 lg:py-32">
      {/* glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-brand-500/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-sky-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              AI inside Rest
            </div>
            <h2 className="mt-4 text-4xl lg:text-5xl font-semibold tracking-tight">
              <span className="gradient-text">An AI that knows what your project costs</span>
              {' '}— before you do.
            </h2>
            <p className="mt-6 text-lg text-white/65 leading-relaxed">
              We trained on three years of real builder data — POs, invoices,
              milestone deltas, vendor performance. The result is a model that
              quietly watches your project and tells you the things a CFO finds
              out three months too late.
            </p>

            <ul className="mt-8 space-y-4">
              <Capability
                icon={AlertTriangle}
                title="Anomaly detection on every line item"
                body="Catches double-billing, scope creep, and quiet rate hikes from your vendors the moment they happen."
              />
              <Capability
                icon={TrendingDown}
                title="Switch-vendor ROI, computed live"
                body="Recommends which vendor to swap in for the next milestone — with the rupee saving spelled out."
              />
              <Capability
                icon={BarChart3}
                title="Forecasting that learns"
                body="Predicts which milestones will slip and which sites need a second engineer this month."
              />
              <Capability
                icon={Zap}
                title="Board pack, auto-drafted"
                body="Your monthly investor or board update — narrated, charted, and source-linked back to the underlying data."
              />
            </ul>
          </div>

          {/* Mockup */}
          <AIInsightMock />
        </div>
      </div>
    </section>
  );
}

function Capability({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-sky-300" />
      </div>
      <div>
        <h4 className="text-[15px] font-semibold text-white">{title}</h4>
        <p className="text-sm text-white/60 mt-0.5 leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

function AIInsightMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-gradient-to-br from-brand-500/30 to-sky-400/20 blur-3xl opacity-60 pointer-events-none" />
      <div className="relative rounded-2xl border border-white/10 bg-[#0b1224]/85 backdrop-blur-xl p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-sky-300">
          <Sparkles className="w-3.5 h-3.5" />
          Rest AI · Project monitor
        </div>

        {/* Chart-ish bars */}
        <div className="mt-4 grid grid-cols-12 gap-1 h-28 items-end">
          {[40, 55, 35, 60, 70, 50, 65, 80, 75, 95, 100, 90].map((h, i) => (
            <div key={i} className="relative h-full flex items-end">
              <div
                className={`w-full rounded-sm ${
                  i === 10 ? 'bg-amber-400/90' : 'bg-brand-500/70'
                }`}
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
          <span>Steel spend · 12 weeks</span>
          <span>↑ 11% above forecast</span>
        </div>

        {/* Insight cards */}
        <div className="mt-6 space-y-3">
          <InsightCard
            tag="HIGH IMPACT"
            tagClass="bg-red-500/15 text-red-300 border-red-400/30"
            title="Steel procurement is 11% over forecast — Tower B"
            body="Switching to Vendor C for the next two POs saves ₹6.4 L. They’ve held quotes 23 days; recommend issuing PO this week."
            action="Open recommendation"
          />
          <InsightCard
            tag="WATCH"
            tagClass="bg-amber-500/15 text-amber-300 border-amber-400/30"
            title="Plot A-7 payment 4 days overdue"
            body="Buyer historically pays within 7 days of reminder. Auto-reminder queued; suggest manual follow-up if not cleared by Friday."
            action="Mark followed up"
          />
          <InsightCard
            tag="WIN"
            tagClass="bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
            title="STP milestone delivered 6 days early"
            body="Vendor D continues to over-deliver. Suggest weighting them at 1.4× in the next bid round."
            action="Apply weighting"
          />
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  tag,
  tagClass,
  title,
  body,
  action,
}: {
  tag: string;
  tagClass: string;
  title: string;
  body: string;
  action: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] tracking-wider font-semibold px-1.5 py-0.5 rounded border ${tagClass}`}>
          {tag}
        </span>
        <span className="text-[10px] text-white/40">just now</span>
      </div>
      <div className="mt-1.5 text-sm text-white">{title}</div>
      <div className="mt-1 text-xs text-white/60 leading-relaxed">{body}</div>
      <button className="mt-2 text-[11px] text-sky-300 inline-flex items-center gap-1">
        {action} →
      </button>
    </div>
  );
}
