'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface Me {
  user: { id: string; email: string; displayName: string };
  roleKeys: string[];
  impersonatedBy: string | null;
}

export function AdminShell({
  me,
  children,
}: {
  me: Me;
  children: React.ReactNode;
}) {
  const isSuper = me.roleKeys.includes('super_admin');
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Mobile top bar — hidden on lg+ */}
      <header className="lg:hidden sticky top-0 z-30 bg-slate-900 text-slate-100 px-4 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="p-1.5 rounded hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold">Builder Console</span>
        <Link
          href="/admin/settings/users"
          className="text-xs text-slate-300 hover:text-white"
        >
          {me.user.displayName}
        </Link>
      </header>

      {/* Backdrop (mobile only, when drawer open) */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50"
        />
      )}

      <aside
        className={`bg-slate-900 text-slate-100 p-4 flex flex-col
          fixed inset-y-0 left-0 w-[260px] z-50 transform transition-transform duration-200
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:w-auto`}
      >
        <div className="lg:hidden flex items-center justify-between mb-4">
          <span className="text-sm font-semibold">Builder Console</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
            className="p-1.5 rounded hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="hidden lg:block text-sm font-semibold mb-6">Builder Console</div>
        <nav
          className="space-y-1 text-sm"
          onClick={() => setDrawerOpen(false)}
        >
          <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/admin">
            Dashboard
          </Link>
          <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/admin/sites">
            Sites
          </Link>
          <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/admin/vendors">
            Vendors
          </Link>
          <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/admin/issues">
            Issues
          </Link>
          <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/admin/marketing">
            Marketing
          </Link>
          <Link
            className="block py-1.5 px-3 pl-7 rounded hover:bg-slate-800 text-xs text-slate-300"
            href="/admin/marketing/library"
          >
            ↳ Library
          </Link>
          <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/admin/reports/rera">
            RERA report
          </Link>
          <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/admin/kyc">
            KYC review
          </Link>
          {isSuper && (
            <>
              <div className="pt-4 pb-1 px-3 text-xs uppercase tracking-wider text-slate-400">
                Settings
              </div>
              <Link
                className="block px-3 py-2 rounded hover:bg-slate-800"
                href="/admin/settings/users"
              >
                Users
              </Link>
              <Link
                className="block px-3 py-2 rounded hover:bg-slate-800"
                href="/admin/settings/roles"
              >
                Roles
              </Link>
              <Link
                className="block px-3 py-2 rounded hover:bg-slate-800"
                href="/admin/settings/checklist-templates"
              >
                Checklist templates
              </Link>
              <Link
                className="block px-3 py-2 rounded hover:bg-slate-800"
                href="/admin/settings/audit"
              >
                Audit log
              </Link>
            </>
          )}
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">Signed in</div>
          <div className="text-sm">{me.user.displayName}</div>
          <div className="text-xs text-slate-400">{me.user.email}</div>
          {me.impersonatedBy && (
            <form action="/api/auth/stop-impersonating" method="POST" className="mt-2">
              <button
                type="submit"
                className="w-full rounded bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs px-2 py-1.5 font-medium focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Stop impersonating
              </button>
            </form>
          )}
          <form action="/api/auth/logout" method="POST" className="mt-3">
            <button
              className="text-xs text-slate-400 hover:text-white"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="p-4 lg:p-8 min-w-0">{children}</main>
    </div>
  );
}
