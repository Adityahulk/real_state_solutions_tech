'use client';

import { useState, FormEvent } from 'react';
import { ArrowRight, Check, Calendar, Phone, Mail } from 'lucide-react';

export function DemoCTA() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [sites, setSites] = useState('1-3');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Wire to /api/demo-request later; for now, just acknowledge.
    setSubmitted(true);
  }

  return (
    <section
      id="demo"
      className="relative bg-[#050b1c] text-white py-24 lg:py-32 overflow-hidden"
    >
      {/* Background flair */}
      <div
        className="absolute inset-0 bg-hero-grid bg-[length:56px_56px] pointer-events-none"
        style={{
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)',
        }}
      />
      <div className="absolute -bottom-32 -left-20 w-[600px] h-[600px] bg-brand-500/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -top-32 -right-20 w-[500px] h-[500px] bg-indigo-500/20 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-5 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
        {/* Copy */}
        <div>
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight">
            <span className="bg-gradient-to-br from-white via-indigo-200 to-sky-400 bg-clip-text text-transparent">
              See Rest on your own data.
            </span>
          </h2>
          <p className="mt-5 text-lg text-white/65 leading-relaxed">
            Send us a recent CAD and we&rsquo;ll set up a working sandbox of your
            site before the demo call — so you spend 20 minutes seeing real
            value, not slides.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-white/80">
            <Bullet>20-minute call, your data, no fluff</Bullet>
            <Bullet>NDA on request — your CAD never leaves our India region</Bullet>
            <Bullet>Pilot pricing for the first project</Bullet>
          </ul>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 text-sm text-white/60">
            <a
              href="tel:+919999000000"
              className="inline-flex items-center gap-2 hover:text-white"
            >
              <Phone className="w-4 h-4" /> +91 99990 00000
            </a>
            <a
              href="mailto:hello@rest.solutions"
              className="inline-flex items-center gap-2 hover:text-white"
            >
              <Mail className="w-4 h-4" /> hello@rest.solutions
            </a>
          </div>
        </div>

        {/* Form */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-tr from-brand-500/30 to-sky-400/20 blur-3xl opacity-50 pointer-events-none" />
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 lg:p-8 shadow-2xl">
            {submitted ? (
              <Success />
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-sky-300 font-semibold">
                  <Calendar className="w-3.5 h-3.5" />
                  Book a demo
                </div>
                <h3 className="text-xl font-semibold">Tell us about your project</h3>

                <Field
                  label="Your name"
                  value={name}
                  onChange={setName}
                  placeholder="Rajeev Khanna"
                  required
                />
                <Field
                  label="Company"
                  value={company}
                  onChange={setCompany}
                  placeholder="Sterling Estates"
                  required
                />
                <Field
                  label="Work email"
                  value={email}
                  onChange={setEmail}
                  placeholder="rajeev@sterlingestates.com"
                  type="email"
                  required
                />

                <div>
                  <label
                    htmlFor="sites"
                    className="block text-xs uppercase tracking-wider text-white/55 mb-1.5"
                  >
                    Active projects
                  </label>
                  <select
                    id="sites"
                    value={sites}
                    onChange={(e) => setSites(e.target.value)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-brand-500/70"
                  >
                    <option value="1-3">1–3 projects</option>
                    <option value="4-10">4–10 projects</option>
                    <option value="10+">More than 10</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="group w-full mt-2 inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-xl font-medium hover:bg-white/90"
                >
                  Request my sandbox
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <p className="text-[11px] text-white/40 text-center">
                  We reply within one business day. No newsletter spam, ever.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  const id = `f-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs uppercase tracking-wider text-white/55 mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-brand-500/70"
      />
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-400/15 border border-emerald-400/30 grid place-items-center shrink-0">
        <Check className="w-3 h-3 text-emerald-300" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function Success() {
  return (
    <div className="py-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-400/15 border border-emerald-400/30 grid place-items-center">
        <Check className="w-6 h-6 text-emerald-300" strokeWidth={3} />
      </div>
      <h3 className="mt-5 text-xl font-semibold">We&rsquo;ll be in touch within a day.</h3>
      <p className="mt-2 text-sm text-white/65">
        Your sandbox will be ready before the call. Keep an eye on your inbox.
      </p>
    </div>
  );
}
