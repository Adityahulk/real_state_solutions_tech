'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { BrandMark } from './BrandMark';

const sections: { href: string; label: string }[] = [
  { href: '#solutions', label: 'Solutions' },
  { href: '#ai', label: 'AI' },
  { href: '#process', label: 'How it works' },
  { href: '#clients', label: 'Clients' },
  { href: '#pricing', label: 'Pricing' },
];

export function Nav({ isAuthed }: { isAuthed: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#050b1c]/75 backdrop-blur-md border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between text-white">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <BrandMark className="w-8 h-8" />
          <span className="text-[17px]">Rest</span>
          <span className="hidden sm:inline text-[11px] uppercase tracking-[0.18em] text-white/40 ml-1">
            Real Estate Solutions
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8 text-sm text-white/70">
          {sections.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="hover:text-white transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="text-sm bg-white text-slate-900 hover:bg-white/90 px-4 py-2 rounded-lg font-medium flex items-center gap-1.5"
            >
              Open console <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-white/80 hover:text-white px-3 py-2"
              >
                Sign in
              </Link>
              <a
                href="#demo"
                className="text-sm bg-white text-slate-900 hover:bg-white/90 px-4 py-2 rounded-lg font-medium flex items-center gap-1.5"
              >
                Book a demo <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden text-white p-2"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-[#050b1c] border-t border-white/5 px-5 py-4 text-white">
          <div className="flex flex-col gap-3">
            {sections.map((s) => (
              <a
                key={s.href}
                href={s.href}
                onClick={() => setOpen(false)}
                className="text-sm text-white/80 py-1"
              >
                {s.label}
              </a>
            ))}
            <div className="border-t border-white/10 mt-2 pt-3 flex flex-col gap-2">
              {isAuthed ? (
                <Link
                  href="/dashboard"
                  className="text-sm bg-white text-slate-900 px-4 py-2 rounded-lg font-medium text-center"
                >
                  Open console
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-white/90 px-4 py-2 rounded-lg border border-white/10 text-center"
                  >
                    Sign in
                  </Link>
                  <a
                    href="#demo"
                    onClick={() => setOpen(false)}
                    className="text-sm bg-white text-slate-900 px-4 py-2 rounded-lg font-medium text-center"
                  >
                    Book a demo
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
