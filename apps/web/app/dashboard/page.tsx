import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

/**
 * Role-aware redirect. Logged-in users hit `/dashboard` (or get redirected
 * here from the marketing site's "Go to console" link) and land on the
 * surface that matches their primary role.
 */
export default async function Dashboard() {
  const jar = await cookies();
  const access = jar.get('rest_access')?.value;
  if (!access) redirect('/login');

  const upstream = process.env.API_URL ?? 'http://localhost:4000';
  const res = await fetch(`${upstream}/api/me/abilities`, {
    headers: { authorization: `Bearer ${access}` },
    cache: 'no-store',
  });
  if (!res.ok) redirect('/login');
  const me = (await res.json()) as { roleKeys: string[] };

  if (me.roleKeys.includes('site_engineer')) redirect('/engineer');
  if (
    me.roleKeys.includes('videographer') ||
    me.roleKeys.includes('editor') ||
    me.roleKeys.includes('marketing_head')
  ) {
    redirect('/admin/marketing');
  }
  const adminLike = ['super_admin', 'admin'];
  if (me.roleKeys.some((k) => adminLike.includes(k))) redirect('/admin');
  if (me.roleKeys.includes('plot_owner')) redirect('/owner');
  redirect('/admin');
}
