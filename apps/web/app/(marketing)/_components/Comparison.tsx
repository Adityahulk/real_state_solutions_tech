import { Check, X } from 'lucide-react';

const ROWS: { feature: string; rest: string | true; legacy: string | false }[] = [
  { feature: 'CAD-native plot mapping', rest: true, legacy: false },
  { feature: 'Offline-first engineer PWA', rest: true, legacy: false },
  { feature: 'RERA reporting in state formats', rest: 'One click', legacy: 'Manual export' },
  { feature: 'Multi-owner allotments + e-sign', rest: true, legacy: 'Add-on' },
  { feature: 'Buyer portal with live progress', rest: true, legacy: false },
  { feature: 'AI expense anomaly detection', rest: true, legacy: false },
  { feature: 'Implementation time', rest: '< 2 weeks', legacy: '60–120 days' },
  { feature: 'Per-project pricing', rest: 'Yes', legacy: 'Per-user seat tax' },
];

export function Comparison() {
  return (
    <section
      id="pricing"
      className="relative bg-slate-50 py-24 lg:py-32 border-t border-slate-200"
    >
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.22em] text-brand-700 font-semibold">
            Why Rest
          </div>
          <h2 className="mt-3 text-4xl lg:text-5xl font-semibold tracking-tight gradient-text-dark">
            Built for builders. Not retrofitted from generic ERPs.
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            The platforms most developers use today were built for
            manufacturing or services. Rest was built from a real plot map up.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-4 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  Capability
                </th>
                <th className="py-4 px-5 text-left">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    <span className="font-semibold text-slate-900">Rest</span>
                  </div>
                </th>
                <th className="py-4 px-5 text-left text-slate-500 font-medium">
                  Legacy ERP &amp; spreadsheets
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ROWS.map((r) => (
                <tr key={r.feature} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-5 text-slate-700">{r.feature}</td>
                  <td className="py-3.5 px-5">
                    {r.rest === true ? (
                      <Cell yes>Included</Cell>
                    ) : (
                      <Cell yes>{r.rest}</Cell>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-slate-500">
                    {r.legacy === false ? (
                      <Cell no>Not available</Cell>
                    ) : (
                      <span className="text-slate-500">{r.legacy}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-slate-500 text-center">
          Transparent per-project pricing. No per-seat fees. Talk to us about
          enterprise terms for portfolios over 5 sites.
        </p>
      </div>
    </section>
  );
}

function Cell({ yes, no, children }: { yes?: boolean; no?: boolean; children: React.ReactNode }) {
  if (no) {
    return (
      <span className="inline-flex items-center gap-2 text-slate-400">
        <X className="w-4 h-4" />
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-slate-900">
      <span className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center">
        <Check className="w-2.5 h-2.5 text-emerald-600" strokeWidth={3} />
      </span>
      {yes ? children : children}
    </span>
  );
}
