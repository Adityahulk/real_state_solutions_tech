import { Quote, Star } from 'lucide-react';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
  accent: string;
  stat?: { value: string; label: string };
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'We used to run a 240-plot township on six spreadsheets and a WhatsApp group. Rest replaced the lot in 11 days. Our sales team now closes from a live map; finance reconciles in minutes, not weeks.',
    name: 'Rajeev Khanna',
    role: 'Director, Operations',
    company: 'Sterling Estates',
    initials: 'RK',
    accent: 'from-brand-500 to-indigo-500',
    stat: { value: '11 days', label: 'to go live' },
  },
  {
    quote:
      'The AI flagged a steel vendor quietly inflating rates for two months — that one catch paid for the entire year of the platform. I check the AI brief before my morning chai now.',
    name: 'Anita Bhargava',
    role: 'CFO',
    company: 'Aurum Realty',
    initials: 'AB',
    accent: 'from-emerald-500 to-teal-500',
    stat: { value: '₹38 L', label: 'saved in 90 days' },
  },
  {
    quote:
      'Our site engineers used to send updates over WhatsApp; half were lost. Rest’s offline PWA means even on a basement site with no signal, the update lands. Our weekly review is finally honest.',
    name: 'Vikram Sehgal',
    role: 'VP, Construction',
    company: 'Northbridge Developers',
    initials: 'VS',
    accent: 'from-amber-500 to-orange-500',
    stat: { value: '4.6×', label: 'engineer update volume' },
  },
];

export function Testimonials() {
  return (
    <section
      id="clients"
      className="relative bg-white py-24 lg:py-32 border-t border-slate-200"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.22em] text-brand-700 font-semibold">
            What customers say
          </div>
          <h2 className="mt-3 text-4xl lg:text-5xl font-semibold tracking-tight bg-gradient-to-br from-slate-900 via-blue-700 to-sky-500 bg-clip-text text-transparent">
            Three of North India&rsquo;s largest builders, one platform.
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            Rest powers operations for developers running townships from
            Lucknow to Ludhiana — including three of the ten largest builders
            in North India.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ t }: { t: Testimonial }) {
  return (
    <article className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 flex flex-col">
      <Quote className="absolute top-5 right-5 w-8 h-8 text-slate-100" />
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-current" />
        ))}
      </div>
      <p className="mt-4 text-[15px] text-slate-800 leading-relaxed">
        &ldquo;{t.quote}&rdquo;
      </p>

      {t.stat && (
        <div className="mt-5 rounded-lg border border-brand-500/20 bg-brand-50 px-3 py-2 inline-flex items-baseline gap-2 self-start">
          <span className="text-lg font-semibold text-brand-700">{t.stat.value}</span>
          <span className="text-xs text-slate-600">{t.stat.label}</span>
        </div>
      )}

      <footer className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.accent} text-white flex items-center justify-center text-sm font-semibold shadow-md`}
        >
          {t.initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">{t.name}</div>
          <div className="text-xs text-slate-500">
            {t.role} · {t.company}
          </div>
        </div>
      </footer>
    </article>
  );
}
