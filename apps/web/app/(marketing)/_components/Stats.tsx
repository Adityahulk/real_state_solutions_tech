import { Building2, Users, Clock, TrendingDown } from 'lucide-react';

const STATS = [
  {
    icon: Building2,
    value: '₹2,400 Cr',
    label: 'transactions managed',
    sub: 'across 14 active townships in 5 states',
  },
  {
    icon: Users,
    value: '12,400+',
    label: 'plots tracked live',
    sub: 'with sub-second sync across roles',
  },
  {
    icon: Clock,
    value: '98%',
    label: 'on-time RERA filings',
    sub: 'one-click MahaRERA, RERA-UP, K-RERA',
  },
  {
    icon: TrendingDown,
    value: '40%',
    label: 'admin overhead reduced',
    sub: 'measured across 3 launch customers',
  },
];

export function Stats() {
  return (
    <section className="relative bg-white border-y border-slate-200 py-20 dotted-bg">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-xs uppercase tracking-[0.22em] text-brand-700 font-semibold">
            Impact
          </div>
          <h2 className="mt-3 text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900">
            Numbers our customers report after one year on Rest.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(({ icon: Icon, value, label, sub }) => (
            <div
              key={label}
              className="rounded-2xl bg-white border border-slate-200 p-6 text-center"
            >
              <div className="w-10 h-10 mx-auto rounded-xl bg-brand-50 border border-brand-500/15 flex items-center justify-center">
                <Icon className="w-4 h-4 text-brand-700" />
              </div>
              <div className="mt-4 text-3xl lg:text-4xl font-semibold tracking-tight gradient-text-dark">
                {value}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">{label}</div>
              <div className="mt-1 text-xs text-slate-500 leading-relaxed">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
