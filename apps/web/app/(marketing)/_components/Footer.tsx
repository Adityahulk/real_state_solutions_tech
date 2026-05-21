import Link from 'next/link';
import { BrandMark } from './BrandMark';

export function Footer() {
  return (
    <footer className="bg-[#03070f] text-white/70 border-t border-white/5 pt-16 pb-10">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link href="/" className="flex items-center gap-2.5 text-white">
            <BrandMark className="w-8 h-8" />
            <span className="font-semibold tracking-tight text-[17px]">Rest</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/40 ml-1">
              Real Estate Solutions
            </span>
          </Link>
          <p className="mt-5 text-sm max-w-sm text-white/55 leading-relaxed">
            The operating system for India&rsquo;s real estate developers.
            Built in India, used by some of its largest builders.
          </p>
          <p className="mt-6 text-xs text-white/40">
            Registered in Uttar Pradesh, India · GST and CIN available on request.
          </p>
        </div>

        <FooterCol
          title="Product"
          items={[
            { label: 'Solutions', href: '#solutions' },
            { label: 'AI', href: '#ai' },
            { label: 'How it works', href: '#process' },
            { label: 'Pricing', href: '#pricing' },
          ]}
        />
        <FooterCol
          title="Company"
          items={[
            { label: 'Clients', href: '#clients' },
            { label: 'Book a demo', href: '#demo' },
            { label: 'Careers', href: '#' },
            { label: 'Press', href: '#' },
          ]}
        />
        <FooterCol
          title="Account"
          items={[
            { label: 'Sign in', href: '/login' },
            { label: 'Open console', href: '/dashboard' },
            { label: 'Status', href: '#' },
            { label: 'Security', href: '#' },
          ]}
        />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8 mt-14 pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-white/40">
        <div>&copy; {new Date().getFullYear()} Real Estate Solutions Tech Pvt. Ltd. All rights reserved.</div>
        <div className="flex gap-5">
          <a href="#" className="hover:text-white/70">Privacy</a>
          <a href="#" className="hover:text-white/70">Terms</a>
          <a href="#" className="hover:text-white/70">DPA</a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div className="md:col-span-2">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40 font-semibold">
        {title}
      </div>
      <ul className="mt-4 space-y-2.5 text-sm">
        {items.map((it) => (
          <li key={it.label}>
            <a href={it.href} className="hover:text-white transition-colors">
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
