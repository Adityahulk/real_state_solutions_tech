import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const UPSTREAM = process.env.API_URL ?? 'http://localhost:4000';

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get('rest_refresh')?.value;
  if (refresh) {
    await fetch(`${UPSTREAM}/api/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    }).catch(() => undefined);
  }
  const res = NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'));
  res.cookies.delete('rest_access');
  res.cookies.delete('rest_refresh');
  return res;
}
