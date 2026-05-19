import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminShell } from './AdminShell';

async function fetchMe() {
  const jar = await cookies();
  const access = jar.get('rest_access')?.value;
  if (!access) return null;
  const upstream = process.env.API_URL ?? 'http://localhost:4000';
  const res = await fetch(`${upstream}/api/me/abilities`, {
    headers: { authorization: `Bearer ${access}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    user: { id: string; email: string; displayName: string };
    roleKeys: string[];
    impersonatedBy: string | null;
  }>;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await fetchMe();
  if (!me) redirect('/login');
  return <AdminShell me={me}>{children}</AdminShell>;
}
