import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { AdminShell } from './AdminShell';

interface Me {
  user: { id: string; email: string; displayName: string };
  roleKeys: string[];
  impersonatedBy: string | null;
}

/**
 * Cached so that, within a single React render, multiple callers
 * (layout + nested server components) share one fetch instead of
 * hammering the API. Combined with the access-token-keyed Next data
 * cache below, this turns "auth check on every navigation" from a
 * synchronous round-trip into a cheap in-memory hit for the common
 * case where the token is unchanged.
 */
const fetchMe = cache(async (access: string): Promise<Me | null> => {
  const upstream = process.env.API_URL ?? 'http://localhost:4000';
  const res = await fetch(`${upstream}/api/me/abilities`, {
    headers: { authorization: `Bearer ${access}` },
    // 30s window: short enough that role/impersonation changes propagate
    // quickly, long enough that rapid clicking around the console doesn't
    // each cost a network round-trip.
    next: { revalidate: 30, tags: [`me:${access.slice(-12)}`] },
  });
  if (!res.ok) return null;
  return res.json() as Promise<Me>;
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const access = jar.get('rest_access')?.value;
  if (!access) redirect('/login');
  const me = await fetchMe(access);
  if (!me) redirect('/login');
  return <AdminShell me={me}>{children}</AdminShell>;
}
