import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function EngineerLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  if (!jar.get('rest_access')) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/engineer" className="font-semibold">
            Engineer
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button className="text-xs text-slate-300 hover:text-white">Sign out</button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
