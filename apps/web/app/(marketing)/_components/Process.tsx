import { Upload, MapPinned, Workflow, Rocket } from 'lucide-react';

const STEPS = [
  {
    icon: Upload,
    num: '01',
    title: 'Bring your CAD',
    body:
      'Drop a DXF, GeoJSON or even a PDF site plan. Our parser produces clean, versioned plot geometry — no surveying re-work.',
  },
  {
    icon: MapPinned,
    num: '02',
    title: 'Activate the digital site',
    body:
      'Review parsed plots, dev items, and amenities. One click activates everything across sales, construction and the buyer portal.',
  },
  {
    icon: Workflow,
    num: '03',
    title: 'Run your teams on Rest',
    body:
      'Sales allots, finance collects, engineers update from the field, marketing publishes. Every team sees the same source of truth.',
  },
  {
    icon: Rocket,
    num: '04',
    title: 'Let the AI compound',
    body:
      'As your data grows, the model gets sharper at flagging overspend, slips, and revenue you’re leaving on the table.',
  },
];

export function Process() {
  return (
    <section id="process" className="relative bg-slate-50 py-24 lg:py-32 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.22em] text-brand-700 font-semibold">
            How it works
          </div>
          <h2 className="mt-3 text-4xl lg:text-5xl font-semibold tracking-tight gradient-text-dark">
            From CAD to closing in four moves.
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            Most platforms force a 90-day implementation. Rest goes from
            uploaded drawing to live operations in under two weeks — because
            it’s built for how Indian builders actually run a site.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, num, title, body }, i) => (
            <li key={num} className="relative rounded-2xl bg-white border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono text-slate-300">{num}</span>
              </div>
              <h3 className="mt-5 text-[17px] font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-slate-300 to-transparent" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
