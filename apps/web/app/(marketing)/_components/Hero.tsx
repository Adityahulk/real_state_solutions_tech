import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { DashboardPreview } from './DashboardPreview';

export function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="hero-bg relative overflow-hidden text-white">
      <div className="hero-grid absolute inset-0 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8 pt-32 pb-20 lg:pt-40 lg:pb-28">
        {/* Eyebrow */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            Built with North India&rsquo;s largest developers
            <span className="w-px h-3 bg-white/15" />
            <span className="text-emerald-300">v3.2 — AI release</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="mt-7 mx-auto max-w-5xl text-center text-[40px] leading-[1.05] sm:text-6xl lg:text-7xl font-semibold tracking-tight">
          <span className="gradient-text">The operating system</span>
          <br />
          for India&rsquo;s real estate developers.
        </h1>

        <p className="mt-7 mx-auto max-w-2xl text-center text-lg text-white/65 leading-relaxed">
          From CAD-to-CRM site mapping and construction tracking to AI expense
          intelligence and RERA filings — one unified platform replacing the
          spreadsheets, ERPs and WhatsApp groups your teams run on today.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#demo"
            className="group inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-xl font-medium hover:bg-white/90 transition-colors"
          >
            Book a 20-minute demo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href="#solutions"
            className="inline-flex items-center gap-2 bg-white/5 border border-white/15 text-white px-5 py-3 rounded-xl font-medium hover:bg-white/10 transition-colors"
          >
            Explore solutions
          </a>
          {isAuthed && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white px-3 py-3 text-sm"
            >
              Open my console →
            </Link>
          )}
        </div>

        {/* Trust micro-row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/50">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            RERA-compliant by design
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span>SOC 2 Type II in progress</span>
          <span className="w-px h-3 bg-white/10" />
          <span>Hosted in India, AES-256 at rest</span>
        </div>

        {/* Dashboard preview */}
        <div className="mt-16 lg:mt-20 relative float-y">
          {/* Glow behind the preview */}
          <div
            className="absolute -inset-x-10 -inset-y-6 bg-gradient-to-tr from-brand-500/30 via-sky-400/20 to-indigo-500/30 blur-3xl opacity-60 pointer-events-none"
            aria-hidden="true"
          />
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
