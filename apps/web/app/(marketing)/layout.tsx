import type { Metadata } from 'next';
import './marketing.css';

export const metadata: Metadata = {
  title: 'Rest — The operating system for India\'s real estate developers',
  description:
    'From CAD-to-CRM site mapping and construction tracking to AI expense intelligence and RERA compliance — Rest is the unified platform trusted by India\'s largest builders.',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="marketing-root">{children}</div>;
}
