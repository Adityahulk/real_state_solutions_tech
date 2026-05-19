import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  if (!jar.get('rest_access')) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/owner" className="font-semibold">
            Plot Owner Portal
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/owner" className="text-slate-600 hover:text-slate-900">
              Plots
            </Link>
            <Link href="/owner/kyc" className="text-slate-600 hover:text-slate-900">
              KYC
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button className="text-slate-500 hover:text-slate-800">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
