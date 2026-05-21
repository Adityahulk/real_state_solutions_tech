import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rest — The operating system for India\'s real estate developers',
  description:
    'From CAD-to-CRM site mapping and construction tracking to AI expense intelligence and RERA compliance — Rest is the unified platform trusted by India\'s largest builders.',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  // bg-white so the body's bg-slate-50 doesn't peek through anywhere; min-h
  // so short sections still cover the viewport.
  return <div className="bg-white text-slate-900 min-h-screen">{children}</div>;
}
